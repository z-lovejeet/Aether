"""Gemini Flash wrapper — heavy multimodal extraction (docs/05a §LLM Choice).

Exposes: ocr_image(bytes, mime), transcribe_audio(bytes, mime).
Both return (text, confidence) with retry/backoff per blueprint §6.
"""

from __future__ import annotations

import asyncio
import base64
import json
import os
from typing import Any

from google import genai
from google.genai import types as gtypes
from dotenv import load_dotenv

load_dotenv(".env")
load_dotenv(".env.local")

_client: genai.Client | None = None

# Active valid Gemini models: 3.6-flash (fast, primary) -> 3.7-flash
GEMINI_FALLBACK_CHAIN = [
    "gemini-3.6-flash",
    "gemini-3.7-flash",
]


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY missing from agents/.env")
        _client = genai.Client(api_key=api_key)
    return _client


def _model_chain() -> list[str]:
    """Primary model from env (default gemini-3.6-flash), then the fallback ladder."""
    primary = os.environ.get("GEMINI_MODEL") or GEMINI_FALLBACK_CHAIN[0]
    return [primary] + [m for m in GEMINI_FALLBACK_CHAIN if m != primary]


async def _generate(parts: list[gtypes.Part], json_mode: bool = False) -> str:
    """Async generate walking the model fallback chain (blueprint §6)."""
    client = _get_client()
    config = gtypes.GenerateContentConfig(
        response_mime_type="application/json" if json_mode else None,
        temperature=0.1,
    )
    last_err: Exception | None = None
    for model in _model_chain():
        for attempt in range(2):
            try:
                resp = await asyncio.to_thread(
                    client.models.generate_content,
                    model=model,
                    contents=parts,
                    config=config,
                )
                text = resp.text or ""
                if not text.strip():
                    raise ValueError("empty response")
                return text
            except Exception as err:
                last_err = err
                if attempt == 0:
                    await asyncio.sleep(0.3)
        print(f"[gemini] {model} exhausted, falling back…")
    raise RuntimeError(f"All Gemini models failed: {last_err}")


def _b64_part(data: bytes, mime: str) -> gtypes.Part:
    return gtypes.Part.from_bytes(data=data, mime_type=mime)


async def ocr_image(image_bytes: bytes, mime: str = "image/jpeg") -> tuple[str, float]:
    """OCR a photo of a page using direct Gemini Flash vision. Returns (transcribed_text, confidence 0..1)."""
    prompt = (
        "Transcribe ALL text, formulas, headings, bullet points, and code visible in this study material photo. "
        "Preserve original language, LaTeX math equations (e.g. $...$ or $$...$$), and formatting. "
        "Do not summarize or add commentary. Output clean structured markdown directly."
    )
    raw = await _generate([_b64_part(image_bytes, mime), prompt], json_mode=False)
    return raw.strip(), 0.95


async def transcribe_audio(audio_bytes: bytes, mime: str = "audio/mpeg") -> tuple[str, float]:
    """Transcribe lecture audio using direct Gemini Flash. Returns (transcript, confidence)."""
    prompt = (
        "Transcribe this spoken lecture audio completely. Preserve original terminology and formulas. "
        "Format into readable paragraphs with clear headings at natural topic shifts. "
        "Output the transcript directly in structured Markdown."
    )
    raw = await _generate([_b64_part(audio_bytes, mime), prompt], json_mode=False)
    return raw.strip(), 0.95


async def vision_page_fallback(image_bytes: bytes, mime: str) -> str:
    """Plain OCR for scanned-PDF pages (no confidence JSON needed)."""
    prompt = (
        "Transcribe all text in this scanned document page image exactly, "
        "preserving structure and language. Return plain text only."
    )
    return await _generate([_b64_part(image_bytes, mime), prompt])


def b64_data_url(data: bytes, mime: str) -> str:
    return f"data:{mime};base64," + base64.b64encode(data).decode()


def parse_json_safe(raw: str) -> Any:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    start_arr, end_arr = cleaned.find("["), cleaned.rfind("]")
    start_obj, end_obj = cleaned.find("{"), cleaned.rfind("}")

    if start_arr != -1 and end_arr > start_arr and (start_obj == -1 or start_arr < start_obj):
        try:
            return json.loads(cleaned[start_arr : end_arr + 1])
        except json.JSONDecodeError:
            pass

    if start_obj != -1 and end_obj > start_obj:
        try:
            return json.loads(cleaned[start_obj : end_obj + 1])
        except json.JSONDecodeError:
            pass

    if start_arr != -1 and end_arr > start_arr:
        return json.loads(cleaned[start_arr : end_arr + 1])

    return json.loads(cleaned)

