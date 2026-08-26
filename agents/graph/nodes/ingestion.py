"""🔍 Ingestion Agent — docs/05a-ingestion-agent.md

Any input -> clean markdown. Type router:
  photo   -> Gemini Vision OCR (+confidence)
  pdf     -> pypdf text; scanned/insufficient pages -> Gemini native PDF OCR
  text    -> sanitize
  audio   -> Gemini transcription
  youtube -> youtube-transcript-api segments merge
Then: <50-word guard, hash cache, Groq cleanup pass.
"""

from __future__ import annotations

import base64
import hashlib
import json
import os
import re
from pathlib import Path
from typing import Any

from ..events import emit

CACHE_DIR = Path(os.environ.get("INGEST_CACHE_DIR", ".cache/ingest"))
MIN_WORDS = 50  # docs/05a §Error Handling


# ---------------------------------------------------------------- helpers


def _sha(data: str | bytes) -> str:
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def _cache_get(key: str) -> dict[str, Any] | None:
    p = CACHE_DIR / f"{key}.json"
    if p.exists():
        try:
            return json.loads(p.read_text())
        except json.JSONDecodeError:
            return None
    return None


def _cache_put(key: str, value: dict[str, Any]) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    (CACHE_DIR / f"{key}.json").write_text(json.dumps(value))


def _sanitize(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{4,}", "\n\n\n", text)
    return text.strip()


def _split_data_url(payload: dict) -> tuple[bytes, str]:
    b64 = payload.get("dataUrl") or payload.get("base64") or ""
    mime = payload.get("mime") or "application/octet-stream"
    if ";" in b64 and b64.startswith("data:"):
        header, b64 = b64.split(",", 1)
        mime = header.split(":")[1].split(";")[0] or mime
    return base64.b64decode(b64), mime


async def _extract_photo(payload: dict) -> tuple[str, float, dict]:
    from llm.gemini import ocr_image

    raw, mime = _split_data_url(payload)
    text, conf = await ocr_image(raw, mime if mime.startswith("image/") else "image/jpeg")
    return text, conf, {"mime": mime}


async def _extract_pdf(payload: dict) -> tuple[str, float, dict]:
    from io import BytesIO

    from pypdf import PdfReader

    raw, _ = _split_data_url(payload)
    reader = PdfReader(BytesIO(raw))
    n_pages = len(reader.pages)
    texts = [(page.extract_text() or "") for page in reader.pages]
    joined = "\n\n".join(texts).strip()

    # Scanned / image-only PDF: near-zero extractable text layer.
    if len(joined) < 200 * max(1, n_pages // 2):
        from llm.gemini import _b64_part, _generate

        prompt = (
            "Transcribe all text in this PDF document exactly, preserving "
            "structure, headings and language. Return plain text only."
        )
        joined = await _generate([_b64_part(raw, "application/pdf"), prompt])
        return joined, 0.7, {"pages": n_pages, "extraction": "gemini_native_pdf_ocr"}

    return joined, 0.95, {"pages": n_pages, "extraction": "pypdf_text_layer"}


async def _extract_audio(payload: dict) -> tuple[str, float, dict]:
    from llm.gemini import transcribe_audio

    raw, mime = _split_data_url(payload)
    if not mime.startswith("audio/"):
        mime = "audio/mpeg"
    return await transcribe_audio(raw, mime)


async def _extract_youtube(payload: dict) -> tuple[str, float, dict]:
    from youtube_transcript_api import YouTubeTranscriptApi

    url = str(payload.get("url", ""))
    m = re.search(r"(?:v=|youtu\.be/|shorts/|embed/)([A-Za-z0-9_-]{11})", url)
    video_id = m.group(1) if m else url.strip()[:11]

    api = YouTubeTranscriptApi()
    fetched = api.fetch(video_id)  # default language, falls back list
    lines = [sn.text for sn in fetched]
    merged = _sanitize(" ".join(lines))
    return merged, 0.9, {
        "videoId": video_id,
        "segments": len(lines),
        "durationSec": int(getattr(fetched, "duration", 0) or len(lines) * 4),
    }


EXTRACTORS = {
    "photo": _extract_photo,
    "pdf": _extract_pdf,
    "audio": _extract_audio,
    "youtube": _extract_youtube,
}


# ---------------------------------------------------------------- node


async def ingestion_agent(state: dict) -> dict:
    """Produce cleanedText + sourceMeta from any supported input."""
    raw_input = state.get("rawInput") or {}
    src_type = str(raw_input.get("type", "text"))
    payload = raw_input.get("payload") or {}
    language_hint = str((state.get("learningDNA") or {}).get("language", ""))

    # ---- text passthrough (no LLM extraction needed) ----
    if src_type == "text":
        raw = _sanitize(str(payload.get("text", "")))
        confidence, meta = 1.0, {"chars": len(raw)}
    else:
        extractor = EXTRACTORS.get(src_type)
        if extractor is None:
            return {
                "errors": [{
                    "code": "UNSUPPORTED_TYPE",
                    "message": f"Unsupported source_type '{src_type}'",
                    "retryable": False,
                }]
            }
        # hash-based cache (docs/05a §Cost Notes): skip expensive extraction
        cache_key = f"{src_type}:{_sha(json.dumps(payload, sort_keys=True)[:100000])}"
        cached = _cache_get(cache_key)
        if cached:
            await emit("asset_ready", node="ingestion_agent", data={"cached": True})
            raw, confidence, meta = cached["raw"], cached["confidence"], cached["meta"]
        else:
            raw, confidence, meta = await extractor(payload)
            _cache_put(cache_key, {"raw": raw, "confidence": confidence, "meta": meta})

    # ---- quality gate: too little content ----
    if len(raw.split()) < MIN_WORDS:
        return {
            "errors": [{
                "code": "TOO_LITTLE_CONTENT",
                "message": (
                    "We could only find a few words here — please upload a "
                    "clearer photo or add more context."
                ),
                "retryable": True,
            }],
            "cleanedText": "",
            "sourceMeta": {**meta, "ocr_confidence": confidence},
        }

    # ---- Groq cleanup pass (restore structure; preserve language) ----
    from llm.groq import cleanup_text

    cleaned = await cleanup_text(_sanitize(raw), language_hint)

    result_meta = {
        **meta,
        "language_detected": language_hint or "auto",
        "ocr_confidence": round(confidence, 2),
    }
    out: dict[str, Any] = {"cleanedText": cleaned, "sourceMeta": result_meta}

    # low-confidence warn-but-continue path (docs/05a §Graph Position)
    if confidence < 0.6:
        out["errors"] = [{
            "code": "LOW_OCR_CONFIDENCE",
            "message": "Extraction confidence is low — results may be imperfect.",
            "retryable": True,
        }]
    return out
