"""🎯 Quiz Master Agent — docs/05e-quiz-master.md

Generates quiz bank: MCQ + short-answer + explain-in-your-words items,
grounded ONLY in source material, calibrated to mastery level and DNA.
Mix: 40% recall, 30% application, 20% explain, 10% connect-two-concepts.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import os
from pathlib import Path
from typing import Any

from ..events import emit

CACHE_DIR = Path(os.environ.get("QUIZ_CACHE_DIR", ".cache/quiz"))

SYSTEM_PROMPT = """You write retrieval-practice questions grounded ONLY in the source material.
Generate quiz questions for a student with goal={goal}, level={level}.

RULES:
1. Mix: 40% recall (mcq), 30% application (short), 20% explain-in-your-words (explain), 10% connect-two-concepts (short).
2. Every MCQ has exactly 4 options (A-D) — distractors must be plausible misconceptions, NOT jokes.
3. For 'short' questions: answer in 1-2 sentences.
4. For 'explain' questions: include a model answer AND 3 rubric bullet points for grading.
5. Difficulty 1-5 calibrated to learner level: beginner=1-3, intermediate=2-4, advanced=3-5.
6. One concept per question — attach the conceptId.
7. NEVER ask about content NOT in the material.
8. Generate {count} questions total across all concepts.

Return STRICT JSON object:
{{
  "quizItems": [
    {{
      "conceptId": "c1",
      "qtype": "mcq",
      "question": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "answer": "A",
      "difficulty": 3
    }},
    {{
      "conceptId": "c2",
      "qtype": "short",
      "question": "...",
      "options": null,
      "answer": "Model answer here...",
      "difficulty": 2
    }}
  ]
}}"""


def _cache_key(cleaned: str, level: str, goal: str) -> str:
    h = hashlib.sha256(cleaned.encode()).hexdigest()[:24]
    return f"quiz-{h}-{level}-{goal}"


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


def _validate_quiz_items(raw: Any, concept_ids: set[str]) -> list[dict]:
    """Validate and sanitize quiz items from LLM output."""
    if isinstance(raw, dict):
        raw = raw.get("questions") or raw.get("quizItems") or raw.get("items") or []
    if not isinstance(raw, list):
        return []

    valid_qtypes = {"mcq", "short", "explain"}
    cleaned = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        qtype = str(item.get("qtype", "")).lower()
        if qtype not in valid_qtypes:
            qtype = "short"

        question = str(item.get("question", "")).strip()
        answer = str(item.get("answer", "")).strip()
        if not question or not answer:
            continue

        concept_id = str(item.get("conceptId", "")).strip()

        options = item.get("options")
        if qtype == "mcq":
            if not isinstance(options, list) or len(options) < 2:
                qtype = "short"
                options = None
            else:
                options = [str(o).strip() for o in options[:6]]
        else:
            options = None

        difficulty = int(item.get("difficulty", 3))
        difficulty = max(1, min(5, difficulty))

        cleaned.append({
            "conceptId": concept_id,
            "qtype": qtype,
            "question": question,
            "options": options,
            "answer": answer,
            "difficulty": difficulty,
        })
    return cleaned


async def quiz_master(state: dict) -> dict:
    """Generate quiz bank from concept tree + source text."""
    await emit("node_start", node="quiz_master")

    cleaned = state.get("cleanedText") or ""
    concept_tree = state.get("conceptTree") or []
    dna = state.get("learningDNA") or {}

    if not cleaned.strip() or not concept_tree:
        return {}

    level_by_subj = dna.get("levelBySubject") or {}
    subject = state.get("subject") or "General"
    level = level_by_subj.get(subject) or state.get("level") or "beginner"
    goal = dna.get("goal") or "exam"

    # Cache check
    key = _cache_key(cleaned, level, goal)
    cached = _cache_get(key)
    if cached:
        await emit("asset_ready", node="quiz_master", data={"cached": True, "count": len(cached)})
        return {"generatedAssets": {**(state.get("generatedAssets") or {}), "quizItems": cached}}

    # Determine question count: ~1 per leaf concept, 4 to 8 questions
    leaves = [n for n in concept_tree if not any(
        c.get("parentId") == n.get("id") for c in concept_tree
    )]
    count = max(4, min(len(leaves), 8))

    concept_summary = "\n".join([
        f"- {n['name']} (id={n.get('id','?')}, difficulty={n.get('difficulty',3)}): "
        + "; ".join(n.get("keyFacts", [])[:3])
        for n in concept_tree
    ])

    system = SYSTEM_PROMPT.format(goal=goal, level=level, count=count)
    user_payload = (
        f"CONCEPTS:\n{concept_summary}\n\n"
        f"SOURCE EXCERPT:\n\"\"\"\n{cleaned[:2500]}\n\"\"\""
    )

    from llm.groq import generate_json
    from llm.gemini import parse_json_safe

    quiz_items: list[dict] = []
    concept_ids = {n.get("id", "") for n in concept_tree}

    for attempt in range(2):
        try:
            raw_json = await generate_json(system, user_payload, preferred_model="openai/gpt-oss-20b")
            parsed = parse_json_safe(raw_json)
            quiz_items = _validate_quiz_items(parsed, concept_ids)
            if quiz_items:
                break
        except Exception as err:
            print(f"[quiz_master] attempt {attempt + 1} failed: {err}")
            if attempt == 0:
                await asyncio.sleep(0.2)

    # Fallback: generate simple recall questions from keyFacts
    if not quiz_items:
        for node in leaves[:10]:
            for fact in node.get("keyFacts", [])[:1]:
                quiz_items.append({
                    "conceptId": node.get("id", ""),
                    "qtype": "short",
                    "question": f"What is the key fact about {node['name']}?",
                    "options": None,
                    "answer": fact,
                    "difficulty": node.get("difficulty", 3),
                })

    _cache_put(key, quiz_items)
    await emit("asset_ready", node="quiz_master", data={"count": len(quiz_items)})
    return {"generatedAssets": {**(state.get("generatedAssets") or {}), "quizItems": quiz_items}}
