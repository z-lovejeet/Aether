"""🩺 Remediation Coach Agent — docs/05h-remediation-coach.md

The creative-AI crown jewel. When a concept fails twice, stops quizzing
and re-teaches using a strategy ladder. Each step: diagnose → re-teach →
micro-check. On success, writes winning strategy to Learning DNA.

Strategy ladder: analogy → visual → steps → simpler → story → different_interest
Max 5 ladder steps. Start from learningDNA.explanationStyle preference.
"""

from __future__ import annotations

import asyncio
from typing import Any

from ..events import emit

# Strategy ladder — ordered per docs/04-data-model.md §4
STRATEGY_LADDER: list[str] = [
    "analogy",
    "visual",
    "steps",
    "simpler",
    "story",
    "different_interest",
]

MAX_LADDER_STEPS = 5

# Map learningDNA.explanationStyle → starting strategy
STYLE_TO_STRATEGY: dict[str, str] = {
    "analogies": "analogy",
    "examples": "analogy",  # closest match
    "visual": "visual",
    "steps": "steps",
}

REMEDIATION_SYSTEM_PROMPT = """You are Coach — a warm, empathetic tutor. The learner failed '{concept}' twice.
Detected misconception: {misconception_type} — evidence: "{evidence}".

TASK: Re-teach using STRATEGY = {strategy}.

RULES:
1. First, restate the misconception empathetically ("I see the trap — you said X, but watch…")
2. Re-teach using ONLY the {strategy} approach, ≤120 words, grounded in the source excerpt
3. Use the learner's interests ({interests}) to make it relatable when possible
4. Tone: warm, zero condescension, encouraging
5. End with ONE fresh micro-check question testing the SAME concept from a NEW angle
6. The micro-check must be answerable in 1-2 sentences
7. NEVER reuse strategies already tried for this concept: [{tried_strategies}]

STRATEGY DEFINITIONS:
- analogy: Explain via a relatable real-world analogy
- visual: Describe a mental picture, diagram, or spatial metaphor
- steps: Break into numbered sequential steps
- simpler: Explain at a grade level below (simpler vocabulary)
- story: Frame as a narrative or story
- different_interest: Re-explain using the learner's specific interest domain

Return STRICT JSON:
{{
  "diagnosisMd": "Your empathetic restatement of the misconception",
  "reteachMd": "Your re-teaching using the strategy (≤120 words)",
  "microCheckQuestion": "Your fresh question testing the same concept",
  "microCheckAnswer": "The expected correct answer (1-2 sentences)"
}}
"""

MICRO_CHECK_GRADING_PROMPT = """You are grading a micro-check response during remediation tutoring.

Concept: {concept}
Question: {question}
Expected answer: {expected_answer}
Student's response: {student_response}

Be GENEROUS — if the core idea is present, even if wording differs, mark as correct.
This is remediation; we want to celebrate progress.

Return STRICT JSON:
{{
  "passed": true,
  "feedbackMd": "Brief encouraging feedback (1 sentence)"
}}
"""


def _get_start_index(explanation_style: str) -> int:
    """Get the starting index in the strategy ladder based on learner preference."""
    preferred = STYLE_TO_STRATEGY.get(explanation_style, "analogy")
    try:
        return STRATEGY_LADDER.index(preferred)
    except ValueError:
        return 0


def _get_next_strategy(
    tried: list[str],
    start_index: int,
) -> str | None:
    """Pick the next untried strategy from the ladder. Returns None if exhausted."""
    tried_set = set(tried)
    # Start from preferred position, then wrap around
    order = STRATEGY_LADDER[start_index:] + STRATEGY_LADDER[:start_index]
    for s in order:
        if s not in tried_set:
            return s
    return None


async def generate_remediation_step(
    concept_name: str,
    misconception_type: str,
    evidence_quote: str,
    strategy: str,
    tried_strategies: list[str],
    interests: list[str],
    source_excerpt: str,
) -> dict[str, Any]:
    """Generate a single remediation step using LLM.

    Returns dict with: diagnosisMd, reteachMd, microCheckQuestion, microCheckAnswer
    """
    from llm.groq import generate_json
    from llm.gemini import parse_json_safe

    prompt = REMEDIATION_SYSTEM_PROMPT.format(
        concept=concept_name,
        misconception_type=misconception_type,
        evidence=evidence_quote[:200],
        strategy=strategy,
        interests=", ".join(interests[:5]) if interests else "general knowledge",
        tried_strategies=", ".join(tried_strategies) if tried_strategies else "none",
    )

    user_payload = f"SOURCE EXCERPT (ground truth):\n\"\"\"\n{source_excerpt[:4000]}\n\"\"\""

    for attempt in range(2):
        try:
            raw = await generate_json(prompt, user_payload)
            parsed = parse_json_safe(raw)
            if not isinstance(parsed, dict):
                raise ValueError("expected JSON object")

            return {
                "diagnosisMd": str(parsed.get("diagnosisMd", "Let me help you with this concept."))[:500],
                "reteachMd": str(parsed.get("reteachMd", ""))[:800],
                "microCheckQuestion": str(parsed.get("microCheckQuestion", "Can you explain this concept in your own words?"))[:500],
                "microCheckAnswer": str(parsed.get("microCheckAnswer", ""))[:500],
            }
        except Exception as err:
            print(f"[remediation_coach] step generation attempt {attempt + 1} failed: {err}")
            if attempt == 0:
                await asyncio.sleep(1.0)

    # Fallback: generate a generic step
    return {
        "diagnosisMd": "I notice you're finding this concept tricky — that's completely normal. Let's approach it differently.",
        "reteachMd": f"Let me try explaining this using a {strategy} approach. Think about the core idea and how it connects to what you already know.",
        "microCheckQuestion": f"In your own words, can you explain the key idea behind {concept_name}?",
        "microCheckAnswer": "The student should demonstrate understanding of the core concept.",
    }


async def grade_micro_check(
    concept_name: str,
    question: str,
    expected_answer: str,
    student_response: str,
) -> dict[str, Any]:
    """Grade a micro-check response. Returns {passed: bool, feedbackMd: str}."""
    from llm.groq import generate_json
    from llm.gemini import parse_json_safe

    prompt = MICRO_CHECK_GRADING_PROMPT.format(
        concept=concept_name,
        question=question,
        expected_answer=expected_answer,
        student_response=student_response,
    )

    for attempt in range(2):
        try:
            raw = await generate_json(prompt, "Grade the response above.")
            parsed = parse_json_safe(raw)
            if not isinstance(parsed, dict):
                raise ValueError("expected JSON object")

            passed = bool(parsed.get("passed", False))
            feedback = str(parsed.get("feedbackMd", ""))[:300]
            return {"passed": passed, "feedbackMd": feedback}
        except Exception as err:
            print(f"[remediation_coach] micro-check grading attempt {attempt + 1} failed: {err}")
            if attempt == 0:
                await asyncio.sleep(1.0)

    # Fallback: be generous
    return {"passed": True, "feedbackMd": "Good effort! Let's keep going."}


async def run_remediation(
    concept_id: str,
    concept_name: str,
    misconception_type: str,
    evidence_quote: str,
    source_excerpt: str,
    learning_dna: dict[str, Any] | None = None,
    strategy_history: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Run the full remediation loop for a concept.

    This is the main entry called by the /remediation API.
    Returns the FIRST remediation step for the frontend to render.
    The frontend then calls /remediation/check for each micro-check.

    Returns:
        dict with keys: step, strategy, diagnosisMd, reteachMd,
        microCheckQuestion, microCheckAnswer, totalSteps, isComplete, rescued
    """
    dna = learning_dna or {}
    style = str(dna.get("explanationStyle", "examples"))
    interests = dna.get("interests", ["general"])
    start_idx = _get_start_index(style)

    # Build tried list from strategy_history
    tried: list[str] = []
    if strategy_history:
        tried = [
            str(h.get("strategy", ""))
            for h in strategy_history
            if not h.get("worked", False) and h.get("strategy")
        ]

    strategy = _get_next_strategy(tried, start_idx)
    if not strategy:
        # All strategies exhausted — park concept
        return {
            "step": 0,
            "strategy": None,
            "isComplete": True,
            "rescued": False,
            "messageMd": "We've tried several approaches for this concept. "
                         "Let's give it a rest and come back to it tomorrow with fresh eyes. "
                         "Sometimes concepts click after a good night's sleep! 🌙",
            "totalSteps": len(tried),
        }

    step_data = await generate_remediation_step(
        concept_name=concept_name,
        misconception_type=misconception_type,
        evidence_quote=evidence_quote,
        strategy=strategy,
        tried_strategies=tried,
        interests=interests,
        source_excerpt=source_excerpt,
    )

    return {
        "step": len(tried) + 1,
        "strategy": strategy,
        "diagnosisMd": step_data["diagnosisMd"],
        "reteachMd": step_data["reteachMd"],
        "microCheckQuestion": step_data["microCheckQuestion"],
        "microCheckAnswer": step_data["microCheckAnswer"],
        "isComplete": False,
        "rescued": False,
        "totalSteps": MAX_LADDER_STEPS,
        "triedStrategies": tried + [strategy],
    }


async def remediation_coach(state: dict) -> dict:
    """LangGraph node entry point for remediation.

    Reads: gradeResult, currentAttempt, cleanedText, learningDNA, strategyHistory
    Writes: remediationPlan (list of step dicts)
    """
    await emit("node_start", node="remediation_coach")

    grade = state.get("gradeResult") or {}
    attempt = state.get("currentAttempt") or {}
    concept_id = attempt.get("conceptId", "")
    misconception = grade.get("misconception") or {}

    # Get concept name from concept tree
    concept_name = concept_id
    for c in (state.get("conceptTree") or []):
        if c.get("id") == concept_id:
            concept_name = c.get("name", concept_id)
            break

    dna = state.get("learningDNA") or {}
    history = (state.get("strategyHistory") or {}).get(concept_id, [])
    source = state.get("cleanedText") or ""

    result = await run_remediation(
        concept_id=concept_id,
        concept_name=concept_name,
        misconception_type=misconception.get("type", "partial_recall"),
        evidence_quote=misconception.get("evidenceQuote", ""),
        source_excerpt=source,
        learning_dna=dna,
        strategy_history=history,
    )

    await emit("node_end", node="remediation_coach", data={
        "step": result.get("step"),
        "strategy": result.get("strategy"),
        "rescued": result.get("rescued", False),
    })

    return {"remediationPlan": [result]}
