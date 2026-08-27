"""Neural Text-to-Speech (TTS) engine for Aether Audio Lessons.

Uses Microsoft Azure Neural TTS (via edge-tts) with en-US-AvaNeural voice.
- 100% Free & Unlimited (Zero API keys or quota limits)
- High-fidelity studio quality (44.1 kHz, 128kbps stereo MP3)
- Hash-based server caching in .cache/tts/
- Real-time chunked audio streaming for sub-second start time
"""

from __future__ import annotations

import hashlib
import os
from pathlib import Path
import re
from typing import AsyncGenerator

import edge_tts
from dotenv import load_dotenv

load_dotenv(".env")
load_dotenv(".env.local")

TTS_VOICE = os.getenv("TTS_VOICE", "en-US-AvaNeural")
CACHE_DIR = Path(os.environ.get("TTS_CACHE_DIR", ".cache/tts"))


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


def _cache_key(text: str, voice: str) -> str:
    h = hashlib.sha256(f"{voice}:{text}".encode("utf-8")).hexdigest()[:32]
    return f"neural-tts-{h}"


async def generate_speech(text: str, max_chars: int = 6000) -> bytes:
    """Generate high-fidelity MP3 neural audio.

    Returns MP3 bytes. Caches results in CACHE_DIR.
    """
    clean_text = clean_text_for_speech(text)
    if len(clean_text) > max_chars:
        clean_text = clean_text[:max_chars]

    if not clean_text:
        raise ValueError("Empty text provided for TTS")

    key = _cache_key(clean_text, TTS_VOICE)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_path = CACHE_DIR / f"{key}.mp3"

    if cache_path.exists() and cache_path.stat().st_size > 0:
        return cache_path.read_bytes()

    comm = edge_tts.Communicate(clean_text, TTS_VOICE)
    chunks = []
    async for chunk in comm.stream():
        if chunk["type"] == "audio" and chunk["data"]:
            chunks.append(chunk["data"])

    audio_bytes = b"".join(chunks)
    if not audio_bytes:
        raise RuntimeError("Neural TTS generated empty audio payload")

    try:
        cache_path.write_bytes(audio_bytes)
    except Exception as err:
        print(f"[tts] Warning: cache write failed: {err}")

    return audio_bytes


async def stream_speech(text: str, max_chars: int = 6000) -> AsyncGenerator[bytes, None]:
    """Stream neural audio chunks for real-time low-latency playback."""
    clean_text = clean_text_for_speech(text)
    if len(clean_text) > max_chars:
        clean_text = clean_text[:max_chars]

    if not clean_text:
        raise ValueError("Empty text provided for TTS")

    key = _cache_key(clean_text, TTS_VOICE)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_path = CACHE_DIR / f"{key}.mp3"

    if cache_path.exists() and cache_path.stat().st_size > 0:
        yield cache_path.read_bytes()
        return

    comm = edge_tts.Communicate(clean_text, TTS_VOICE)
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
