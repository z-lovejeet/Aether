"""📅 Scheduler Agent — docs/05i-scheduler.md

Pure SM-2 spaced-repetition algorithm. ZERO LLM calls.
Deterministic, 100% testable. Updates mastery table with new
ease_factor, interval_days, repetitions, due_date after each grade.

SM-2 Algorithm (from docs/04-data-model.md §3):
  For each review with quality q ∈ 0..5:
    if q >= 3 (passed):
      reps == 0 → interval = 1 day
      reps == 1 → interval = 6 days
      else      → interval = round(prev_interval * EF)
      repetitions += 1
    else (failed):
      repetitions = 0; interval = 1; fail_count += 1
    EF' = max(1.3, EF + (0.1 - (5-q)*(0.08 + (5-q)*0.02)))

  Verdict mapping: wrong → q=1, partial → q=3, correct → q=4
  Remediation rescue: q=4 (not 5 — solid but watch it)
"""

from __future__ import annotations

import asyncio
from datetime import date, timedelta
from typing import Any

from ..events import emit


def _verdict_to_quality(verdict: str, from_remediation: bool = False) -> int:
    """Map grading verdict to SM-2 quality score (0-5).

    From docs/04-data-model.md §3:
      wrong → q=1, partial → q=3, correct → q=4/5
      Remediation rescue: q=4 (not 5)
    """
    if verdict == "correct":
        return 4 if from_remediation else 4  # could use 5 for "easy" feel
    elif verdict == "partial":
        return 3
    else:  # wrong
        return 1


def compute_sm2(
    ease_factor: float,
    interval_days: float,
    repetitions: int,
    fail_count: int,
    quality: int,
) -> dict[str, Any]:
    """Pure SM-2 computation. Returns new SM-2 state.

    This is the EXACT algorithm from docs/04-data-model.md §3.

    Args:
        ease_factor: current EF (≥1.3)
        interval_days: current interval in days
        repetitions: number of consecutive correct reviews
        fail_count: total failure count
        quality: review quality score 0-5

    Returns:
        dict with: ease_factor, interval_days, repetitions, fail_count, due_date (ISO string)
    """
    # Calculate new EF
    new_ef = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    new_ef = max(1.3, new_ef)

    if quality >= 3:  # passed
        if repetitions == 0:
            new_interval = 1.0
        elif repetitions == 1:
            new_interval = 6.0
        else:
            new_interval = round(interval_days * new_ef)
        new_reps = repetitions + 1
        new_fail_count = fail_count
    else:  # failed
        new_interval = 1.0
        new_reps = 0
        new_fail_count = fail_count + 1

    # Calculate due date
    new_due = date.today() + timedelta(days=int(new_interval))

    return {
        "ease_factor": round(new_ef, 4),
        "interval_days": new_interval,
        "repetitions": new_reps,
        "fail_count": new_fail_count,
        "due_date": new_due.isoformat(),
    }


async def update_mastery_for_grade(
    concept_id: str,
    verdict: str,
    from_remediation: bool = False,
) -> dict[str, Any]:
    """Fetch current mastery, compute SM-2, update DB. Returns the SM-2 update.

    This is the main entry point for the scheduler — called by both
    the graph node and the /attempts API endpoint.
    """
    from .. import db

    # Fetch current mastery state
    mastery = await asyncio.to_thread(db.get_mastery, concept_id)

    if not mastery:
        # No mastery row — use defaults (should have been seeded by concept_architect)
        mastery = {
            "concept_id": concept_id,
            "ease_factor": 2.5,
            "interval_days": 0.0,
            "repetitions": 0,
            "fail_count": 0,
            "last_strategy": None,
        }

    quality = _verdict_to_quality(verdict, from_remediation)

    sm2_result = compute_sm2(
        ease_factor=mastery["ease_factor"],
        interval_days=mastery["interval_days"],
        repetitions=mastery["repetitions"],
        fail_count=mastery["fail_count"],
        quality=quality,
    )

    # Update DB
    await asyncio.to_thread(
        db.update_mastery,
        concept_id,
        sm2_result["ease_factor"],
        sm2_result["interval_days"],
        sm2_result["repetitions"],
        sm2_result["due_date"],
        sm2_result["fail_count"],
        mastery.get("last_strategy"),
    )

    return {
        "concept_id": concept_id,
        "quality": quality,
        "verdict": verdict,
        **sm2_result,
    }


async def scheduler_agent(state: dict) -> dict:
    """LangGraph node entry point for SM-2 scheduling.

    Reads from state: gradeResult {verdict}, currentAttempt {conceptId or quizItemId}
    Writes to state: sm2Updates [list of SM-2 update records]
    """
    await emit("node_start", node="scheduler_agent")

    grade_result = state.get("gradeResult") or {}
    verdict = grade_result.get("verdict", "wrong")

    attempt = state.get("currentAttempt") or {}
    concept_id = attempt.get("conceptId", "")

    # If we have a quizItemId but not conceptId, look up the concept from the quiz item
    if not concept_id and attempt.get("quizItemId"):
        from .. import db

        quiz_item = await asyncio.to_thread(db.get_quiz_item, attempt["quizItemId"])
        if quiz_item:
            concept_id = quiz_item.get("concept_id", "")

    if not concept_id:
        await emit("node_end", node="scheduler_agent", data={"skipped": True})
        return {"sm2Updates": []}

    try:
        sm2_update = await update_mastery_for_grade(concept_id, verdict)
        await emit("node_end", node="scheduler_agent", data={
            "concept_id": concept_id,
            "verdict": verdict,
            "new_due": sm2_update["due_date"],
            "new_interval": sm2_update["interval_days"],
        })
        return {"sm2Updates": [sm2_update]}
    except Exception as err:
        print(f"[scheduler] SM-2 update failed: {err}")
        await emit("node_end", node="scheduler_agent", data={"error": str(err)})
        return {"sm2Updates": []}
