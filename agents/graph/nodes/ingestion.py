"""🔍 Ingestion Agent — docs/05a-ingestion-agent.md

Any input -> clean markdown. Type router:
  photo   -> Gemini Vision OCR (+confidence)
  pdf     -> pypdf text; scanned/insufficient pages -> Gemini native PDF OCR
  text    -> sanitize; short prompts/topics -> academic study material expansion
  audio   -> Gemini transcription
  youtube -> youtube-transcript-api segments merge
Then: quality check, hash cache, Groq cleanup / expansion pass.
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
MIN_WORDS = 50  # Below this threshold, we expand short topics into complete study guides


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
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        (CACHE_DIR / f"{key}.json").write_text(json.dumps(value))
    except Exception as err:
        print(f"[ingestion] cache write warning: {err}")


def _sanitize(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{4,}", "\n\n\n", text)
    return text.strip()


def _split_data_url(payload: dict) -> tuple[bytes, str]:
    """Robustly extract decoded bytes and MIME type from various frontend payload formats."""
    if not isinstance(payload, dict):
        return b"", "application/octet-stream"

    b64 = (
        payload.get("data_base64")
        or payload.get("dataUrl")
        or payload.get("base64")
        or payload.get("data")
        or ""
    )
    mime = (
        payload.get("mime_type")
        or payload.get("mime")
        or payload.get("contentType")
        or "application/octet-stream"
    )

    if isinstance(b64, str) and ";" in b64 and b64.startswith("data:"):
        parts = b64.split(",", 1)
        header = parts[0]
        b64 = parts[1] if len(parts) > 1 else ""
        if ":" in header and ";" in header:
            detected_mime = header.split(":")[1].split(";")[0]
            if detected_mime:
                mime = detected_mime

    if not b64 or not isinstance(b64, str) or not b64.strip():
        return b"", mime

    try:
        clean_b64 = re.sub(r"\s+", "", b64.strip())
        decoded = base64.b64decode(clean_b64)
        return decoded, mime
    except Exception as e:
        print(f"[_split_data_url] base64 decode error: {e}")
        return b"", mime


async def _extract_photo(payload: dict) -> tuple[str, float, dict]:
    from llm.gemini import ocr_image

    raw, mime = _split_data_url(payload)
    if not raw or len(raw) == 0:
        raise ValueError("Photo data was empty. Please re-select the image.")

    text, conf = await ocr_image(raw, mime if mime.startswith("image/") else "image/jpeg")
    return text, conf, {"mime": mime}


async def _extract_pdf(payload: dict) -> tuple[str, float, dict]:
    from io import BytesIO
    from pypdf import PdfReader

    raw, _ = _split_data_url(payload)
    if not raw or len(raw) == 0:
        raise ValueError("PDF file data was empty or could not be decoded. Please re-select the file.")

    joined = ""
    n_pages = 0
    try:
        reader = PdfReader(BytesIO(raw))
        n_pages = len(reader.pages)
        texts = [(page.extract_text() or "") for page in reader.pages]
        joined = "\n\n".join(texts).strip()
    except Exception as pdf_err:
        print(f"[pdf] pypdf read warning ({pdf_err}), will attempt Gemini PDF OCR…")

    # If PDF is scanned, image-only, or sparse text -> Gemini native multimodal PDF OCR
    if len(joined) < 150 * max(1, n_pages // 2):
        from llm.gemini import _b64_part, _generate

        prompt = (
            "Transcribe all text, formulas, headings, and key points in this PDF document "
            "completely and accurately. Preserve structure, headings and language. Return plain text only."
        )
        try:
            gemini_extracted = await _generate([_b64_part(raw, "application/pdf"), prompt])
            if gemini_extracted.strip():
                return gemini_extracted, 0.85, {"pages": n_pages, "extraction": "gemini_native_pdf_ocr"}
        except Exception as ocr_err:
            print(f"[pdf] Gemini PDF OCR fallback failed: {ocr_err}")

    if not joined.strip():
        raise ValueError("Could not extract readable text from this PDF. Please verify the document.")

    return joined, 0.95, {"pages": n_pages, "extraction": "pypdf_text_layer"}


async def _extract_audio(payload: dict) -> tuple[str, float, dict]:
    from llm.gemini import transcribe_audio

    raw, mime = _split_data_url(payload)
    if not raw or len(raw) == 0:
        raise ValueError("Audio data was empty. Please record or re-select the audio file.")

    if not mime.startswith("audio/"):
        mime = "audio/mpeg"
    return await transcribe_audio(raw, mime)


async def _extract_youtube(payload: dict) -> tuple[str, float, dict]:
    from youtube_transcript_api import YouTubeTranscriptApi

    url = str(payload.get("url", ""))
    m = re.search(r"(?:v=|youtu\.be/|shorts/|embed/)([A-Za-z0-9_-]{11})", url)
    video_id = m.group(1) if m else url.strip()[:11]

    if not video_id:
        raise ValueError("Invalid YouTube URL. Please check the link.")

    api = YouTubeTranscriptApi()
    fetched = api.fetch(video_id)
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


async def _expand_topic_to_study_material(
    topic: str,
    subject: str = "General",
    level: str = "intermediate",
    language_hint: str = "",
) -> str:
    """Expand a short topic or concept prompt into a rich, structured study guide text."""
    from llm.groq import _groq_generate
    from llm.gemini import _generate

    sys_prompt = (
        f"You are a master educator and academic curriculum author in {subject}. "
        f"The learner provided a short topic and needs a rich, comprehensive, high-yield study chapter. "
        f"Target audience: {level} student. Language: {language_hint or 'English'}.\n\n"
        "Generate a structured, in-depth academic study guide in clean Markdown. Include:\n"
        "1. # [Comprehensive Topic Title]\n"
        "2. ## 1. Core Definition & Foundational Concepts\n"
        "3. ## 2. Key Principles, Mechanisms, or Lifecycle Stages\n"
        "4. ## 3. Core Architecture, Frameworks, or Mathematical Formulations\n"
        "5. ## 4. Real-World Applications & Practical Case Studies\n"
        "6. ## 5. Common Pitfalls, Trade-offs & Exam High-Yield Points\n\n"
        "Requirements:\n"
        "- Write clear, engaging, thorough paragraphs with concrete examples and bullet points.\n"
        "- Total length: at least 350-550 words so it serves as a complete study material.\n"
        "- Do NOT include conversational greetings or meta-talk. Return ONLY the markdown study text."
    )
    user_prompt = f"Topic to expand into full study material: \"{topic}\"\nSubject: {subject}\nLevel: {level}"

    try:
        expanded = await _groq_generate(sys_prompt, user_prompt)
        if len(expanded.split()) >= 80:
            return expanded
    except Exception as err:
        print(f"[ingestion] Groq topic expansion failed ({err}), falling back to Gemini…")

    try:
        expanded = await _generate([sys_prompt + "\n\n" + user_prompt])
        if len(expanded.split()) >= 80:
            return expanded
    except Exception as gemini_err:
        print(f"[ingestion] Gemini expansion fallback failed: {gemini_err}")

    return topic


# ---------------------------------------------------------------- node


async def ingestion_agent(state: dict) -> dict:
    """Produce cleanedText + sourceMeta from any supported input."""
    raw_input = state.get("rawInput") or {}
    src_type = str(raw_input.get("type", "text"))
    payload = raw_input.get("payload") or {}
    subject = str(state.get("subject", "General"))
    level = str(state.get("level", "intermediate"))
    language_hint = str((state.get("learningDNA") or {}).get("language", ""))

    raw = ""
    confidence = 1.0
    meta: dict[str, Any] = {}

    # ---- text passthrough or file extraction ----
    if src_type == "text":
        raw = _sanitize(str(payload.get("text", "")))
        confidence, meta = 1.0, {"chars": len(raw), "type": "text"}
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
        
        # hash-based cache: skip expensive extraction if identical payload was seen
        cache_key = f"{src_type}:{_sha(json.dumps(payload, sort_keys=True)[:100000])}"
        cached = _cache_get(cache_key)
        if cached:
            await emit("asset_ready", node="ingestion_agent", data={"cached": True})
            raw, confidence, meta = cached["raw"], cached["confidence"], cached["meta"]
        else:
            try:
                raw, confidence, meta = await extractor(payload)
                _cache_put(cache_key, {"raw": raw, "confidence": confidence, "meta": meta})
            except Exception as extract_err:
                print(f"[ingestion] extraction error: {extract_err}")
                return {
                    "errors": [{
                        "code": "EXTRACTION_FAILED",
                        "message": str(extract_err),
                        "retryable": True,
                    }],
                    "cleanedText": "",
                    "sourceMeta": {"error": str(extract_err)},
                }

    raw = raw.strip()

    # ---- quality gate & intelligent topic expansion ----
    if len(raw) == 0:
        return {
            "errors": [{
                "code": "EMPTY_CONTENT",
                "message": "No readable content was found. Please check your notes or file.",
                "retryable": True,
            }],
            "cleanedText": "",
            "sourceMeta": meta,
        }

    # If the user supplied a concise prompt or short topic (e.g. "Agile development"),
    # expand it into a comprehensive foundational study chapter automatically!
    if len(raw.split()) < MIN_WORDS:
        print(f"[ingestion] Short input detected ({len(raw.split())} words) — expanding into comprehensive study material…")
        expanded = await _expand_topic_to_study_material(
            topic=raw,
            subject=subject,
            level=level,
            language_hint=language_hint,
        )
        if len(expanded.split()) >= 50:
            raw = expanded
            meta["expanded_from_topic"] = True
            confidence = 1.0
        elif len(raw.split()) < 3 and src_type != "text":
            return {
                "errors": [{
                    "code": "TOO_LITTLE_CONTENT",
                    "message": "We could only find a few characters in this scan — please upload a clearer document or enter notes directly.",
                    "retryable": True,
                }],
                "cleanedText": "",
                "sourceMeta": {**meta, "ocr_confidence": confidence},
            }

    # ---- Groq cleanup pass (restore structure; preserve language) ----
    from llm.groq import cleanup_text

    cleaned = await cleanup_text(_sanitize(raw), language_hint)
    if not cleaned.strip():
        cleaned = raw

    result_meta = {
        **meta,
        "language_detected": language_hint or "auto",
        "ocr_confidence": round(confidence, 2),
        "word_count": len(cleaned.split()),
    }
    out: dict[str, Any] = {"cleanedText": cleaned, "sourceMeta": result_meta}

    if confidence < 0.6:
        out["errors"] = [{
            "code": "LOW_OCR_CONFIDENCE",
            "message": "Extraction confidence is moderate — results may be imperfect.",
            "retryable": True,
        }]

    return out
