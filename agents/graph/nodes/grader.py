"""⚖️ Grader Agent — docs/05g-grader.md

Evaluates student answers and returns structured verdicts with
misconception detection. MCQs graded deterministically; short/explain
use LLM rubric grading via Groq with Gemini fallback.

Misconception taxonomy:
  overgeneralization | reversed_causality | wrong_priority |
  terminology_confusion | partial_recall | invented_fact
"""

from __future__ import annotations

import asyncio
from typing import Any

from ..events import emit

MISCONCEPTION_TAXONOMY = [
    "overgeneralization",
    "reversed_causality",
    "wrong_priority",
    "terminology_confusion",
    "partial_recall",
    "invented_fact",
]

GRADING_SYSTEM_PROMPT = """You are an exam grader. Compare the learner's answer to the model answer + rubric, grounded ONLY in the source excerpt.

RULES:
1. Verdicts: "correct" (fully right), "partial" (partially right, key idea present but incomplete or slightly wrong), "wrong" (fundamentally incorrect or off-topic).
2. For "wrong" or "partial", identify the single best-fit misconception type from this taxonomy: overgeneralization, reversed_causality, wrong_priority, terminology_confusion, partial_recall, invented_fact.
3. For the misconception, QUOTE the exact phrase from the student's answer that reveals it.
4. Feedback: 1-2 sentences, encouraging tone. NEVER reveal the full correct answer (a retry may follow). Guide them toward the right direction.
5. Score: 1.0 for correct, 0.5 for partial, 0.0 for wrong.

Return STRICT JSON:
{{
  "verdict": "correct" | "partial" | "wrong",
  "score": 0.0,
  "misconception": {{
    "type": "taxonomy_type_here",
    "evidenceQuote": "exact phrase from student answer"
  }},
  "feedbackMd": "Your encouraging feedback here"
}}

If verdict is "correct", set misconception to null.
"""


def _grade_mcq(student_response: str, correct_answer: str, options: list[str] | None) -> dict[str, Any]:
    """Deterministic MCQ grading — no LLM needed.

    Matching logic:
    1. Extract leading letter (A/B/C/D) from both student response and correct answer
    2. Case-insensitive comparison
    3. If student selected the option text, extract the letter from it
    """
    # Normalize the correct answer — extract just the letter
    correct_letter = correct_answer.strip().upper()
    if len(correct_letter) > 1:
        correct_letter = correct_letter[0]  # "A) ..." → "A"

    # Normalize student response — extract the letter
    student_text = student_response.strip()
    student_letter = ""

    if len(student_text) == 1:
        student_letter = student_text.upper()
    elif len(student_text) >= 2 and student_text[1] in ") .":
        student_letter = student_text[0].upper()
    elif options:
        # Student sent the full option text — find which option it matches
        for opt in options:
            opt_clean = opt.strip()
            if student_text.strip().lower() == opt_clean.lower():
                student_letter = opt_clean[0].upper()
                break
        if not student_letter and student_text:
            student_letter = student_text[0].upper()
    else:
        student_letter = student_text[0].upper() if student_text else ""

    is_correct = student_letter == correct_letter

    if is_correct:
        return {
            "verdict": "correct",
            "score": 1.0,
            "misconception": None,
            "feedbackMd": "✨ Correct! Well done — you've got a solid grasp of this concept.",
        }
    else:
        return {
            "verdict": "wrong",
            "score": 0.0,
            "misconception": {
                "type": "wrong_priority",
                "evidenceQuote": student_text[:100],
            },
            "feedbackMd": f"Not quite — review this concept and consider why option {correct_letter} might be the stronger choice. You're on the right track!",
        }


async def _grade_open_ended(
    student_response: str,
    model_answer: str,
    question: str,
    source_excerpt: str,
    qtype: str,
) -> dict[str, Any]:
    """LLM-based rubric grading for short-answer and explain questions.
    Uses Groq for speed with Gemini fallback."""
    from llm.groq import generate_json
    from llm.gemini import parse_json_safe

    user_payload = (
        f"QUESTION: {question}\n\n"
        f"QUESTION TYPE: {qtype}\n\n"
        f"MODEL ANSWER & RUBRIC:\n\"\"\"\n{model_answer}\n\"\"\"\n\n"
        f"STUDENT'S ANSWER:\n\"\"\"\n{student_response}\n\"\"\"\n\n"
        f"SOURCE EXCERPT (ground truth):\n\"\"\"\n{source_excerpt[:4000]}\n\"\"\""
    )

    for attempt in range(2):
        try:
            raw = await generate_json(GRADING_SYSTEM_PROMPT, user_payload)
            parsed = parse_json_safe(raw)

            if not isinstance(parsed, dict):
                raise ValueError("expected JSON object")

            # Validate and sanitize the parsed result
            verdict = str(parsed.get("verdict", "wrong")).lower()
            if verdict not in ("correct", "partial", "wrong"):
                verdict = "wrong"

            score = float(parsed.get("score", 0.0))
            score = max(0.0, min(1.0, score))

            misconception = parsed.get("misconception")
            if verdict == "correct":
                misconception = None
            elif misconception and isinstance(misconception, dict):
                m_type = str(misconception.get("type", "partial_recall"))
                if m_type not in MISCONCEPTION_TAXONOMY:
                    m_type = "partial_recall"
                misconception = {
                    "type": m_type,
                    "evidenceQuote": str(misconception.get("evidenceQuote", ""))[:200],
                }
            elif verdict != "correct":
                misconception = {
                    "type": "partial_recall",
                    "evidenceQuote": student_response[:100],
                }

            feedback = str(parsed.get("feedbackMd", "Review this concept and try again."))
            if len(feedback) > 500:
                feedback = feedback[:497] + "..."

            return {
                "verdict": verdict,
                "score": score,
                "misconception": misconception,
                "feedbackMd": feedback,
            }
        except Exception as err:
            print(f"[grader] open-ended grading attempt {attempt + 1} failed: {err}")
            if attempt == 0:
                await asyncio.sleep(1.0)

    # Fallback: assume wrong with generic feedback
    return {
        "verdict": "wrong",
        "score": 0.0,
        "misconception": {
            "type": "partial_recall",
            "evidenceQuote": student_response[:100],
        },
        "feedbackMd": "I couldn't fully evaluate your answer. Please review the concept and try again.",
    }


async def grade_answer(
    quiz_item: dict[str, Any],
    student_response: str,
    source_excerpt: str = "",
) -> dict[str, Any]:
    """Main grading entry point. Called by both the graph node and the API.

    Args:
        quiz_item: dict with keys id, concept_id, question, options, answer, qtype, difficulty
        student_response: the student's answer text
        source_excerpt: cleaned text for grounding (used by LLM grading)

    Returns:
        dict with keys: verdict, score, misconception, feedbackMd
    """
    qtype = quiz_item.get("qtype", "short")

    if qtype == "mcq":
        return _grade_mcq(
            student_response,
            quiz_item.get("answer", ""),
            quiz_item.get("options"),
        )
    else:
        # short or explain — LLM grading
        return await _grade_open_ended(
            student_response=student_response,
            model_answer=quiz_item.get("answer", ""),
            question=quiz_item.get("question", ""),
            source_excerpt=source_excerpt,
            qtype=qtype,
        )


async def grader(state: dict) -> dict:
    """LangGraph node entry point for grading.

    Reads from state: currentAttempt {quizItemId, response}, cleanedText
    Writes to state: gradeResult {verdict, score, misconception, feedbackMd}
    """
    await emit("node_start", node="grader")

    attempt = state.get("currentAttempt") or {}
    quiz_item_id = attempt.get("quizItemId") or attempt.get("conceptId", "")
    response = attempt.get("response", "")

    if not quiz_item_id or not response:
        return {
            "gradeResult": {
                "verdict": "wrong",
                "score": 0.0,
                "misconception": None,
                "feedbackMd": "No answer provided.",
            }
        }

    # Fetch quiz item from DB
    from .. import db

    quiz_item = await asyncio.to_thread(db.get_quiz_item, quiz_item_id)

    if not quiz_item:
        return {
            "gradeResult": {
                "verdict": "wrong",
                "score": 0.0,
                "misconception": None,
                "feedbackMd": "Quiz item not found.",
            }
        }

    source_excerpt = state.get("cleanedText") or ""
    grade_result = await grade_answer(quiz_item, response, source_excerpt)

    # Persist attempt to DB
    user_id = state.get("userId") or "dev-user"
    try:
        is_correct = grade_result["verdict"] == "correct"
        is_partial = grade_result["verdict"] == "partial"
        misconception_str = None
        if grade_result.get("misconception"):
            misconception_str = grade_result["misconception"].get("type", "")

        await asyncio.to_thread(
            db.insert_attempt,
            user_id,
            quiz_item_id,
            is_correct,
            is_partial,
            response,
            misconception_str,
        )
    except Exception as err:
        print(f"[grader] failed to persist attempt: {err}")

    # Inject fail_count so orchestrator's after_grade can route to remediation_coach
    if grade_result["verdict"] == "wrong" and quiz_item.get("concept_id"):
        mastery = await asyncio.to_thread(db.get_mastery, quiz_item["concept_id"])
        if mastery:
            grade_result["fail_count"] = mastery["fail_count"]

    await emit("node_end", node="grader", data={"verdict": grade_result["verdict"]})

    return {"gradeResult": grade_result}
