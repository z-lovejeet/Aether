"""✍️ Content Forge Agent — docs/05d-content-forge.md

Generates personalized explainerMd + cheatSheetMd from the concept tree,
source text, and learner's Learning DNA. Every paragraph is filtered
through the learner's goal, level, style, and interests.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import os
from pathlib import Path
from typing import Any

from ..events import emit

CACHE_DIR = Path(os.environ.get("FORGE_CACHE_DIR", ".cache/forge"))

# ---- Prompts (docs/05d §Prompt Strategy) ----

EXPLAINER_SYSTEM = """You are writing a personalized study explainer for THIS learner:
- Goal: {goal}
- Level: {level}
- Explanation style: {style} (use this style heavily)
- Interests: {interests} (draw analogies from these)
- Language: {language} (keep technical terms in English)
- Session length: {session_min} min

RULES:
1. Ground EVERY fact in the source material — NEVER invent content.
2. Prefer analogies drawn from the learner's interests.
3. One concept per section.
4. Each section format: ## [Concept Name]\n\n**Hook** (1 sentence attention grab) → **Explanation** (2-4 paragraphs) → **Micro-example** (concrete) → **💡 Takeaway** (1 line).
5. Reading level matched to {level}: beginner=simple vocabulary, intermediate=standard academic, advanced=concise technical.
6. Use markdown formatting: bold key terms, bullet lists for processes, > blockquotes for important definitions.
7. Do NOT add a general intro title — start directly with the first concept section.

Return ONLY the markdown explainer content."""

CHEATSHEET_SYSTEM = """You are creating a one-page cheat sheet for a student.
Condense the following explainer into a single-page reference:
- Use a compact format: ## Topic → bullet points with key facts
- Include ALL key terms in **bold**
- Include formulas, definitions, and critical relationships
- Max 600 words total
- No prose paragraphs — only bullets, tables, and short phrases

Return ONLY the markdown cheat sheet content."""


def _cache_key(cleaned: str, dna: dict) -> str:
    h = hashlib.sha256(cleaned.encode()).hexdigest()[:24]
    dna_sig = f"{dna.get('goal','')}-{dna.get('explanationStyle','')}-{','.join(dna.get('interests',[]))}"
    return f"forge-{h}-{hashlib.sha256(dna_sig.encode()).hexdigest()[:8]}"


def _cache_get(key: str) -> dict[str, Any] | None:
    p = CACHE_DIR / f"{key}.json"
    if p.exists():
        try:
            return json.loads(p.read_text())
        except (json.JSONDecodeError, OSError):
            return None
    return None


def _cache_put(key: str, value: dict[str, Any]) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    (CACHE_DIR / f"{key}.json").write_text(json.dumps(value))


def _build_concept_outline(concept_tree: list[dict]) -> str:
    """Build a readable outline of concepts for the LLM prompt."""
    lines = []
    for node in concept_tree:
        prefix = "  - " if node.get("parentId") else "- "
        facts = "; ".join(node.get("keyFacts", [])[:3])
        lines.append(f"{prefix}{node['name']} (difficulty {node.get('difficulty',3)}): {facts}")
    return "\n".join(lines)


async def content_forge(state: dict) -> dict:
    """Generate personalized explainer + cheat sheet."""
    await emit("node_start", node="content_forge")

    cleaned = state.get("cleanedText") or ""
    concept_tree = state.get("conceptTree") or []
    dna = state.get("learningDNA") or {}

    if not cleaned.strip() or not concept_tree:
        return {}  # Nothing to generate from; skip silently

    # ---- Cache check ----
    key = _cache_key(cleaned, dna)
    cached = _cache_get(key)
    if cached:
        await emit("asset_ready", node="content_forge", data={"cached": True})
        return cached

    # ---- Build personalized prompt ----
    level_by_subj = dna.get("levelBySubject") or {}
    subject = state.get("subject") or "General"
    level = level_by_subj.get(subject) or state.get("level") or "beginner"

    concept_outline = _build_concept_outline(concept_tree)

    system = EXPLAINER_SYSTEM.format(
        goal=dna.get("goal", "exam"),
        level=level,
        style=dna.get("explanationStyle", "examples"),
        interests=", ".join(dna.get("interests", ["general"])),
        language=dna.get("language", "en"),
        session_min=dna.get("sessionLengthMin", 15),
    )
    user_payload = (
        f"CONCEPT OUTLINE:\n{concept_outline}\n\n"
        f"SOURCE MATERIAL:\n\"\"\"\n{cleaned[:6000]}\n\"\"\""
    )

    # ---- Generate explainer and cheatsheet in PARALLEL via Groq (Gemini fallback) ----
    from llm.groq import _groq_generate, _gemini_text_fallback

    async def _gen_explainer() -> str:
        try:
            return await _groq_generate(system, user_payload, preferred_model="openai/gpt-oss-120b")
        except Exception:
            try:
                return await _gemini_text_fallback(system, user_payload)
            except Exception as err:
                print(f"[content_forge] explainer generation fallback failed: {err}")
                return cleaned

    async def _gen_cheatsheet() -> str:
        cs_payload = f"CONCEPT OUTLINE:\n{concept_outline}\n\nKEY MATERIAL:\n\"\"\"\n{cleaned[:8000]}\n\"\"\""
        try:
            return await _groq_generate(CHEATSHEET_SYSTEM, cs_payload, preferred_model="openai/gpt-oss-20b")
        except Exception:
            try:
                return await _gemini_text_fallback(CHEATSHEET_SYSTEM, cs_payload)
            except Exception as err:
                print(f"[content_forge] cheatsheet generation fallback failed: {err}")
                return ""

    explainer_md, cheatsheet_md = await asyncio.gather(_gen_explainer(), _gen_cheatsheet())

    result = {
        "generatedAssets": {
            **(state.get("generatedAssets") or {}),
            "explainerMd": explainer_md,
            "cheatSheetMd": cheatsheet_md or explainer_md,
        }
    }
    _cache_put(key, result)
    await emit("asset_ready", node="content_forge", data={"explainer_len": len(explainer_md)})
    return result
