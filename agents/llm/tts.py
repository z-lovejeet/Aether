"""Text-to-Speech (TTS) integration for Phase 9 Audio Lessons.

Primary: ElevenLabs REST API with Bella voice (hpp4J3VqNfWAUOO0d1Us).
Automatic Fallback: Microsoft Edge Neural TTS (en-US-AvaNeural) — 100% free,
unlimited, crystal clear studio-quality neural voice for hackathons & offline demos.
"""

from __future__ import annotations

import hashlib
import os
from pathlib import Path
import re
from typing import AsyncGenerator

import httpx
from dotenv import load_dotenv

load_dotenv(".env")
load_dotenv(".env.local")

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "hpp4J3VqNfWAUOO0d1Us")  # Bella
MODEL_ID = os.getenv("ELEVENLABS_MODEL", "eleven_flash_v2_5")
CACHE_DIR = Path(os.environ.get("TTS_CACHE_DIR", ".cache/tts"))
BASE_TTS_URL = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"


def clean_text_for_speech(text: str) -> str:
    """Prepare markdown and technical text for natural speech synthesis."""
    if not text:
        return ""
    # Strip block LaTeX math $$ ... $$
    t = re.sub(r"\$\$([^$]+)\$\$", r", formula: \1, ", text)
    # Strip inline LaTeX math $ ... $
    t = re.sub(r"\$([^$]+)\$", r", \1, ", t)
    # Clean standard markdown symbols: headers, bold, italics, code backticks, blockquotes, bullets
    t = re.sub(r"#{1,6}\s*", "", t)
    t = re.sub(r"\*\*([^*]+)\*\*", r"\1", t)
    t = re.sub(r"\*([^*]+)\*", r"\1", t)
    t = re.sub(r"`{1,3}([^`]+)`{1,3}", r"\1", t)
    t = re.sub(r"^>\s*", "", t, flags=re.MULTILINE)
    t = re.sub(r"^\s*[-*+]\s+", "", t, flags=re.MULTILINE)
    t = re.sub(r"^\s*\d+\.\s+", "", t, flags=re.MULTILINE)
    # Convert markdown links [text](url) to just text
    t = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", t)
    # Convert multiple line breaks to pauses
    t = re.sub(r"\n{2,}", ". ", t)
    t = re.sub(r"\n", " ", t)
    # Normalize excessive whitespaces and duplicate punctuation
    t = re.sub(r"\s+", " ", t)
    t = re.sub(r"\.{2,}", ".", t)
    return t.strip()


def _cache_key(text: str, voice_id: str, model_id: str) -> str:
    h = hashlib.sha256(f"{voice_id}:{model_id}:{text}".encode("utf-8")).hexdigest()[:32]
    return f"tts-{h}"


async def _generate_edge_tts(clean_text: str) -> bytes:
    """Generate crystal-clear neural speech using Edge-TTS (100% free fallback)."""
    import edge_tts

    comm = edge_tts.Communicate(clean_text, "en-US-AvaNeural")
    chunks = []
    async for chunk in comm.stream():
        if chunk["type"] == "audio":
            chunks.append(chunk["data"])
    return b"".join(chunks)


async def generate_speech(text: str, max_chars: int = 5000) -> bytes:
    """Generate TTS audio.

    Tries ElevenLabs Bella voice first. If quota is exceeded or key is missing,
    automatically falls back to Edge-TTS Neural Voice (100% free & reliable).
    """
    clean_text = clean_text_for_speech(text)
    if len(clean_text) > max_chars:
        clean_text = clean_text[:max_chars]

    if not clean_text:
        raise ValueError("Empty text provided for TTS")

    key = _cache_key(clean_text, VOICE_ID, MODEL_ID)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_path = CACHE_DIR / f"{key}.mp3"

    if cache_path.exists() and cache_path.stat().st_size > 0:
        return cache_path.read_bytes()

    # 1. Try ElevenLabs if configured
    if ELEVENLABS_API_KEY:
        url = f"{BASE_TTS_URL}?output_format=mp3_44100_128&optimize_streaming_latency=3"
        headers = {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        }
        payload = {
            "text": clean_text,
            "model_id": MODEL_ID,
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
                "style": 0.0,
                "use_speaker_boost": True,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code == 200 and len(res.content) > 0:
                    audio_bytes = res.content
                    try:
                        cache_path.write_bytes(audio_bytes)
                    except Exception:
                        pass
                    return audio_bytes
                else:
                    print(f"[tts] ElevenLabs returned {res.status_code}. Using Edge-TTS neural voice fallback.")
        except Exception as err:
            print(f"[tts] ElevenLabs request failed ({err}). Using Edge-TTS neural voice fallback.")

    # 2. Free Neural Voice Fallback (Edge-TTS)
    try:
        audio_bytes = await _generate_edge_tts(clean_text)
        try:
            cache_path.write_bytes(audio_bytes)
        except Exception:
            pass
        return audio_bytes
    except Exception as fallback_err:
        raise RuntimeError(f"All TTS providers failed: {fallback_err}")


async def stream_speech(text: str, max_chars: int = 5000) -> AsyncGenerator[bytes, None]:
    """Stream audio chunks for low-latency playback with automatic fallback."""
    clean_text = clean_text_for_speech(text)
    if len(clean_text) > max_chars:
        clean_text = clean_text[:max_chars]

    if not clean_text:
        raise ValueError("Empty text provided for TTS")

    key = _cache_key(clean_text, VOICE_ID, MODEL_ID)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_path = CACHE_DIR / f"{key}.mp3"

    if cache_path.exists() and cache_path.stat().st_size > 0:
        yield cache_path.read_bytes()
        return

    # 1. Try ElevenLabs stream
    if ELEVENLABS_API_KEY:
        url = f"{BASE_TTS_URL}/stream?output_format=mp3_44100_128&optimize_streaming_latency=3"
        headers = {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        }
        payload = {
            "text": clean_text,
            "model_id": MODEL_ID,
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
            },
        }

        collected = []
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                async with client.stream("POST", url, headers=headers, json=payload) as res:
                    if res.status_code == 200:
                        async for chunk in res.aiter_bytes():
                            if chunk:
                                collected.append(chunk)
                                yield chunk
                        if collected:
                            try:
                                cache_path.write_bytes(b"".join(collected))
                            except Exception:
                                pass
                        return
                    else:
                        print(f"[tts] ElevenLabs stream {res.status_code}. Using Edge-TTS fallback.")
        except Exception as err:
            print(f"[tts] ElevenLabs stream error ({err}). Using Edge-TTS fallback.")

    # 2. Fallback: Stream via Edge-TTS
    import edge_tts

    comm = edge_tts.Communicate(clean_text, "en-US-AvaNeural")
    collected = []
    async for chunk in comm.stream():
        if chunk["type"] == "audio" and chunk["data"]:
            collected.append(chunk["data"])
            yield chunk["data"]

    if collected:
        try:
            cache_path.write_bytes(b"".join(collected))
        except Exception:
            pass
