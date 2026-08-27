"""🃏 Flashcard Smith Agent — docs/05f-flashcard-smith.md

Auto-generate two-sided flashcards with interest-personalized hints.
Atomic knowledge units that feed the spaced-repetition loop.
Card types: definition, term→meaning, process-order, contrast pairs.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import os
from pathlib import Path
from typing import Any

from ..events import emit

CACHE_DIR = Path(os.environ.get("FLASH_CACHE_DIR", ".cache/flashcards"))

SYSTEM_PROMPT = """Create flashcards from the source material ONLY.
Learner interests: {interests}
Learner style: {style}

RULES:
1. One fact per card.
2. Front = cue/question (≤15 words).
3. Back = complete answer (≤40 words).
4. HINT must leverage one of the learner's interests ({interests}) as a memory bridge WITHOUT giving the answer away.
5. No yes/no fronts.
6. No card should require context from another card.
7. Contrast cards explicitly name the distinguishing feature.
8. Mix card types: definition, term→meaning, process-order ("what comes next?"), contrast pairs.
9. Generate {count} cards across all concepts.

Return STRICT JSON object:
{{
  "flashcards": [
    {{
      "conceptId": "c1",
      "front": "What organelle performs photosynthesis?",
      "back": "Chloroplast — contains chlorophyll pigment in thylakoid membranes.",
      "hint": "Think of it like solar panels on a spacecraft 🚀 — captures light energy!"
    }}
  ]
}}"""


def _cache_key(cleaned: str, interests: list) -> str:
    h = hashlib.sha256(cleaned.encode()).hexdigest()[:24]
    return f"flash-{h}-{hashlib.sha256(','.join(interests).encode()).hexdigest()[:8]}"


def _cache_get(key: str) -> list | None:
    p = CACHE_DIR / f"{key}.json"
    if p.exists():
        try:
            return json.loads(p.read_text())
        except (json.JSONDecodeError, OSError):
            return None
    return None


def _cache_put(key: str, value: list) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    (CACHE_DIR / f"{key}.json").write_text(json.dumps(value))


def _validate_flashcards(raw: Any) -> list[dict]:
    """Validate and sanitize flashcard items from LLM output."""
    if isinstance(raw, dict):
        raw = raw.get("flashcards") or raw.get("cards") or raw.get("items") or []
    if not isinstance(raw, list):
        return []

    cleaned = []
    for card in raw:
        if not isinstance(card, dict):
            continue
        front = str(card.get("front", "")).strip()
        back = str(card.get("back", "")).strip()
        if not front or not back:
            continue
        cleaned.append({
            "conceptId": str(card.get("conceptId", "")).strip(),
            "front": front[:200],
            "back": back[:500],
            "hint": str(card.get("hint", "")).strip()[:300],
        })
    return cleaned


async def flashcard_smith(state: dict) -> dict:
    """Generate interest-personalized flashcards from concept tree."""
    await emit("node_start", node="flashcard_smith")

    cleaned = state.get("cleanedText") or ""
    concept_tree = state.get("conceptTree") or []
    dna = state.get("learningDNA") or {}

    if not cleaned.strip() or not concept_tree:
        return {}

    interests = dna.get("interests") or ["general"]
    style = dna.get("explanationStyle") or "examples"

    # Cache check
    key = _cache_key(cleaned, interests)
    cached = _cache_get(key)
    if cached:
        await emit("asset_ready", node="flashcard_smith", data={"cached": True, "count": len(cached)})
        return {"generatedAssets": {**(state.get("generatedAssets") or {}), "flashcards": cached}}

    # Target: 4 to 8 cards per material
    leaves = [n for n in concept_tree if not any(
        c.get("parentId") == n.get("id") for c in concept_tree
    )]
    count = max(4, min(len(leaves), 8))

    concept_summary = "\n".join([
        f"- {n['name']} (id={n.get('id','?')}): " + "; ".join(n.get("keyFacts", [])[:3])
        for n in concept_tree
    ])

    system = SYSTEM_PROMPT.format(
        interests=", ".join(interests),
        style=style,
        count=count,
    )
    user_payload = (
        f"CONCEPTS:\n{concept_summary}\n\n"
        f"SOURCE EXCERPT:\n\"\"\"\n{cleaned[:2500]}\n\"\"\""
    )

    from llm.groq import generate_json
    from llm.gemini import parse_json_safe

    flashcards: list[dict] = []
    for attempt in range(2):
        try:
            raw_json = await generate_json(system, user_payload)
            parsed = parse_json_safe(raw_json)
            flashcards = _validate_flashcards(parsed)
            if flashcards:
                break
        except Exception as err:
            print(f"[flashcard_smith] attempt {attempt + 1} failed: {err}")
            if attempt == 0:
                await asyncio.sleep(1.0)

    # Fallback: generate simple cards from keyFacts
    if not flashcards:
        for node in leaves[:15]:
            for fact in node.get("keyFacts", [])[:1]:
                flashcards.append({
                    "conceptId": node.get("id", ""),
                    "front": f"What is a key fact about {node['name']}?",
                    "back": fact,
                    "hint": f"Think about how this relates to {interests[0] if interests else 'everyday life'}!",
                })

    _cache_put(key, flashcards)
    await emit("asset_ready", node="flashcard_smith", data={"count": len(flashcards)})
    return {"generatedAssets": {**(state.get("generatedAssets") or {}), "flashcards": flashcards}}
