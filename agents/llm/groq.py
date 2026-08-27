"""Groq wrapper — fast cleanup pass (docs/05a §Tools & Pipeline).

cleanup_text(raw, language) restores structure as clean markdown.
Fallback: Gemini text generation if Groq is unavailable (blueprint §6).
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


@lru_cache(maxsize=4)
def _get_groq(model: str):
    from langchain_groq import ChatGroq

    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY missing from agents/.env")
    return ChatGroq(
        model=model,
        temperature=0.0,
        max_tokens=4096,  # free-tier TPM cap is 8k; keep request well under it
        timeout=25,
    )


# Fallback chain: qwen3.8-27b (fastest, high TPM) -> gpt-oss-20b -> gpt-oss-120b
GROQ_FALLBACK_CHAIN = [
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.6-27b",
]


def _model_chain() -> list[str]:
    """Primary model from env (default gpt-oss-120b), then fallbacks."""
    primary = os.environ.get("GROQ_MODEL") or GROQ_FALLBACK_CHAIN[0]
    return [primary] + [m for m in GROQ_FALLBACK_CHAIN if m != primary]


async def _groq_generate(system: str, user: str) -> str:
    from langchain_core.messages import HumanMessage, SystemMessage

    last_err: Exception | None = None
    for model in _model_chain():
        try:
            resp = await asyncio.to_thread(
                _get_groq(model).invoke,
                [SystemMessage(content=system), HumanMessage(content=user)],
            )
            return str(resp.content)
        except Exception as err:  # noqa: BLE001
            last_err = err
            print(f"[groq] {model} failed ({type(err).__name__}), trying next…")
    raise last_err or RuntimeError("all Groq models failed")


async def _gemini_text_fallback(system: str, user: str) -> str:
    from .gemini import _generate  # walks its own 4-model chain

    return await _generate([system + "\n\n" + user])


async def cleanup_text(raw_text: str, language_hint: str = "") -> str:
    """Restore raw extracted text into clean markdown via Groq."""
    if len(raw_text.strip()) < 1:
        return ""
    user_payload = (
        f"Original language: {language_hint or 'auto-detect (preserve it)'}\n\n"
        f"RAW TEXT:\n\"\"\"\n{raw_text}\n\"\"\""
    )
    last_err: Exception | None = None
    for attempt in range(2):
        try:
            return await _groq_generate(CLEANUP_SYSTEM_PROMPT, user_payload)
        except Exception as err:  # Groq down/rate-limited -> fallback chain
            last_err = err
            await asyncio.sleep(1.0 * (attempt + 1))
            try:
                return await _gemini_text_fallback(CLEANUP_SYSTEM_PROMPT, user_payload)
            except Exception as err2:  # noqa: BLE001
                last_err = err2
    # absolute last resort: return raw text — pipeline can still continue
    print(f"[groq] cleanup failed, returning raw text ({last_err})")
    return raw_text


@lru_cache(maxsize=4)
def _get_groq_json(model: str):
    from langchain_groq import ChatGroq

    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY missing from agents/.env")
    return ChatGroq(
        model=model,
        temperature=0.0,
        max_tokens=4096,
        timeout=25,
        model_kwargs={"response_format": {"type": "json_object"}},
    )


async def generate_json(system: str, user: str) -> str:
    """Generic fast JSON-mode generation with native JSON schema enforcement."""
    from langchain_core.messages import HumanMessage, SystemMessage

    sys_prompt = system + "\nReturn ONLY valid, parseable JSON matching the requested schema."
    last_err: Exception | None = None

    for model in _model_chain():
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

