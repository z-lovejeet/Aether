"""Groq wrapper — fast parallel text and JSON generation (docs/05a §Tools & Pipeline).

Distributes parallel agents across distinct Groq models (gpt-oss-120b, gpt-oss-20b, qwen3.8-27b)
to maximize throughput and prevent token-per-minute (TPM) bottlenecking.
Fallback: Gemini 3.6 Flash if Groq is unavailable.
"""

from __future__ import annotations

import asyncio
import os
from functools import lru_cache
from dotenv import load_dotenv

load_dotenv(".env")
load_dotenv(".env.local")

CLEANUP_SYSTEM_PROMPT = (
    "You are a text restorer. Fix OCR errors and restore document "
    "structure (headings, bullets, tables, paragraphs) as clean markdown. "
    "NEVER change meaning, wording, or add content. Preserve original "
    "language. Return only markdown."
)


@lru_cache(maxsize=8)
def _get_groq(model: str):
    from langchain_groq import ChatGroq

    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY missing from agents/.env")
    return ChatGroq(
        model=model,
        temperature=0.1,
        max_tokens=3000,
        timeout=15,
    )


@lru_cache(maxsize=8)
def _get_groq_json(model: str):
    from langchain_groq import ChatGroq

    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY missing from agents/.env")
    return ChatGroq(
        model=model,
        temperature=0.1,
        max_tokens=3000,
        timeout=15,
        model_kwargs={"response_format": {"type": "json_object"}},
    )


# Active fast Groq models (high TPM, sub-second latency)
GROQ_FALLBACK_CHAIN = [
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b",
]


def _model_chain(preferred_model: str | None = None) -> list[str]:
    """Return model chain prioritized by preferred model or env default."""
    primary = preferred_model or os.environ.get("GROQ_MODEL") or GROQ_FALLBACK_CHAIN[0]
    return [primary] + [m for m in GROQ_FALLBACK_CHAIN if m != primary]


async def _groq_generate(system: str, user: str, preferred_model: str | None = None) -> str:
    from langchain_core.messages import HumanMessage, SystemMessage

    last_err: Exception | None = None
    for model in _model_chain(preferred_model):
        try:
            resp = await asyncio.to_thread(
                _get_groq(model).invoke,
                [SystemMessage(content=system), HumanMessage(content=user)],
            )
            return str(resp.content)
        except Exception as err:
            last_err = err
            print(f"[groq] {model} failed ({type(err).__name__}), trying next…")
    raise last_err or RuntimeError("all Groq models failed")


async def _gemini_text_fallback(system: str, user: str) -> str:
    from .gemini import _generate

    return await _generate([system + "\n\n" + user])


async def cleanup_text(raw_text: str, language_hint: str = "") -> str:
    """Restore raw extracted text into clean markdown via Groq."""
    if len(raw_text.strip()) < 1:
        return ""
    user_payload = (
        f"Original language: {language_hint or 'auto-detect (preserve it)'}\n\n"
        f"RAW TEXT:\n\"\"\"\n{raw_text}\n\"\"\""
    )
    try:
        return await _groq_generate(CLEANUP_SYSTEM_PROMPT, user_payload, preferred_model="openai/gpt-oss-20b")
    except Exception:
        try:
            return await _gemini_text_fallback(CLEANUP_SYSTEM_PROMPT, user_payload)
        except Exception:
            return raw_text


async def generate_json(system: str, user: str, preferred_model: str | None = None) -> str:
    """Generic fast JSON-mode generation with native JSON schema enforcement."""
    from langchain_core.messages import HumanMessage, SystemMessage

    sys_prompt = system + "\nReturn ONLY valid, parseable JSON matching the requested schema."
    last_err: Exception | None = None

    for model in _model_chain(preferred_model):
        try:
            client = _get_groq_json(model)
            resp = await asyncio.to_thread(
                client.invoke,
                [SystemMessage(content=sys_prompt), HumanMessage(content=user)],
            )
            return str(resp.content)
        except Exception as err:
            last_err = err
            print(f"[groq] JSON generation with {model} failed ({err}), trying fallback…")

    # Fallback to Gemini in JSON mode
    try:
        from .gemini import _generate
        return await _generate([sys_prompt + "\n\n" + user], json_mode=True)
    except Exception as gemini_err:
        print(f"[gemini] JSON fallback failed: {gemini_err}")

    raise last_err or RuntimeError("All JSON generation backends failed")
