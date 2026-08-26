"""🧬 Learning DNA Agent — docs/05c-learning-dna-agent.md

Two modes:
1. Onboarding: convert 8 wizard answers → LearningProfile → persist to profiles.learning_dna
2. Inference (Phase 5+): analyze attempt history → update inferredTraits (STUBBED)

This agent is a hub node — called at onboarding/session-end; consulted by
ALL generation agents via state read (never blocking the hot path).
"""

from __future__ import annotations

import asyncio
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from .. import db
from ..events import emit


class LearningProfileSchema(BaseModel):
    """Validated Learning DNA profile matching docs/04-data-model.md §1."""

    goal: Literal["exam", "coursework", "selflearn", "teaching"] = "exam"
    levelBySubject: dict[str, Literal["beginner", "intermediate", "advanced"]] = Field(
        default_factory=dict
    )
    explanationStyle: Literal["examples", "analogies", "steps", "visual"] = "examples"
    interests: list[str] = Field(default_factory=lambda: ["general"])
    sessionLengthMin: Literal[5, 15, 30] = 15
    cadence: Literal["daily", "few_weekly", "cram"] = "daily"
    modality: Literal["read", "listen", "both"] = "read"
    language: str = Field(default="en", min_length=2, max_length=20)
    inferredTraits: dict[str, Any] = Field(default_factory=dict)

    @field_validator("interests")
    @classmethod
    def _clean_interests(cls, v: list[str]) -> list[str]:
        cleaned = [str(i).strip().lower() for i in v if str(i).strip()]
        return cleaned[:10] if cleaned else ["general"]

    @field_validator("language")
    @classmethod
    def _clean_language(cls, v: str) -> str:
        return str(v).strip().lower() or "en"


def _build_profile_from_onboarding(
    answers: dict[str, Any], subject: str = ""
) -> dict[str, Any]:
    """Map raw onboarding answers dict -> LearningProfile dict."""
    subj = str(answers.get("subject") or subject or "General").strip()
    raw_level = str(answers.get("level") or "beginner").lower()
    valid_levels = {"beginner", "intermediate", "advanced"}
    level = raw_level if raw_level in valid_levels else "beginner"

    session_map = {
        "5": 5,
        "15": 15,
        "30": 30,
        5: 5,
        15: 15,
        30: 30,
        "short": 5,
        "medium": 15,
        "long": 30,
    }
    raw_session = answers.get("sessionLengthMin", 15)
    session_min = session_map.get(raw_session, 15)

    raw_interests = answers.get("interests", [])
    if isinstance(raw_interests, str):
        raw_interests = [i.strip() for i in raw_interests.split(",") if i.strip()]
    elif not isinstance(raw_interests, list):
        raw_interests = ["general"]

    goal = str(answers.get("goal") or "exam").lower()
    if goal not in {"exam", "coursework", "selflearn", "teaching"}:
        goal = "exam"

    style = str(answers.get("explanationStyle") or "examples").lower()
    if style not in {"examples", "analogies", "steps", "visual"}:
        style = "examples"

    cadence = str(answers.get("cadence") or "daily").lower()
    if cadence not in {"daily", "few_weekly", "cram"}:
        cadence = "daily"

    modality = str(answers.get("modality") or "read").lower()
    if modality not in {"read", "listen", "both"}:
        modality = "read"

    existing_levels = answers.get("levelBySubject") or {}
    if not isinstance(existing_levels, dict):
        existing_levels = {}
    level_by_subject = {**existing_levels, subj: level}

    profile = {
        "goal": goal,
        "levelBySubject": level_by_subject,
        "explanationStyle": style,
        "interests": raw_interests or ["general"],
        "sessionLengthMin": session_min,
        "cadence": cadence,
        "modality": modality,
        "language": str(answers.get("language") or "en"),
        "inferredTraits": answers.get("inferredTraits") or {},
    }
    return profile


async def learning_dna_agent(state: dict) -> dict:
    """Process onboarding answers -> validated LearningProfile -> persist.

    Returns updated learningDNA in state for downstream agents to read.
    """
    await emit("node_start", node="learning_dna_agent")

    errors: list[dict[str, Any]] = []

    raw_input = state.get("rawInput") or {}
    payload = raw_input.get("payload") if isinstance(raw_input, dict) else {}
    onboarding_answers = {}

    if isinstance(payload, dict):
        onboarding_answers = payload.get("onboardingAnswers") or {}

    if not onboarding_answers and isinstance(state.get("learningDNA"), dict):
        onboarding_answers = state.get("learningDNA") or {}

    if not onboarding_answers:
        onboarding_answers = {
            "goal": "exam",
            "explanationStyle": "examples",
            "interests": ["general"],
            "sessionLengthMin": 15,
            "cadence": "daily",
            "modality": "read",
            "language": "en",
        }

    subject = state.get("subject") or ""
    profile_dict = _build_profile_from_onboarding(onboarding_answers, subject)

    try:
        validated = LearningProfileSchema(**profile_dict)
        profile_dict = validated.model_dump()
    except Exception as err:
        print(f"[learning_dna] validation warning: {err}")
        errors.append(
            {
                "code": "PROFILE_VALIDATION_WARNING",
                "message": f"Profile validation warning: {err}",
                "retryable": False,
            }
        )

    user_id = state.get("userId", "dev-user")
    persist_error = None

    try:
        await asyncio.to_thread(db.upsert_profile, user_id, profile_dict)
    except Exception as err:
        persist_error = str(err)
        print(f"[learning_dna] persistence failed: {err}")
        db.reset_conn()
        errors.append(
            {
                "code": "DB_WRITE_FAILED",
                "message": f"Profile save failed: {persist_error}",
                "retryable": True,
            }
        )

    result: dict[str, Any] = {
        "learningDNA": profile_dict,
        "sourceMeta": {
            **(state.get("sourceMeta") or {}),
            "profileSaved": persist_error is None,
            "questionsAnswered": len(
                [v for v in onboarding_answers.values() if v]
            ),
        },
    }
    if errors:
        result["errors"] = errors

    await emit(
        "asset_ready",
        node="learning_dna_agent",
        data={"profileSaved": persist_error is None},
    )
    return result
