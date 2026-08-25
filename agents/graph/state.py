"""Shared LangGraph state for the Mastery Engine multi-agent system.

Mirror of docs/04-data-model.md §1 (GraphState). Every agent node is a
function state -> Partial[MasteryState]; side effects happen in typed tools.
"""

from __future__ import annotations

from typing import Annotated, Any, Literal, TypedDict

from langgraph.graph.message import add_messages


SourceType = Literal["photo", "pdf", "text", "audio", "youtube"]
Intent = Literal[
    "upload_material",
    "quiz_submitted",
    "next_question",
    "review_due",
    "chat_question",
    "profile_update",
]

StrategyId = Literal[
    "analogy", "visual", "steps", "simpler", "story", "different_interest"
]


class LearningProfile(TypedDict, total=False):
    goal: str  # exam | coursework | selflearn | teaching
    levelBySubject: dict[str, str]  # subject -> beginner|intermediate|advanced
    explanationStyle: str  # examples | analogies | steps | visual
    interests: list[str]
    sessionLengthMin: int  # 5 | 15 | 30
    cadence: str  # daily | few_weekly | cram
    modality: str  # read | listen | both
    language: str
    inferredTraits: dict[str, Any]


class MasteryState(TypedDict, total=False):
    # session meta
    sessionId: str
    userId: str
    intent: Intent

    # ingestion
    rawInput: dict[str, Any]  # {type: SourceType, payload}
    cleanedText: str
    sourceMeta: dict[str, Any]

    # concepts & generated assets
    conceptTree: list[dict[str, Any]]
    generatedAssets: dict[str, Any]  # explainerMd, cheatSheetMd, flashcards, quizItems

    # personalization
    learningDNA: LearningProfile
    strategyHistory: dict[str, list[dict[str, Any]]]  # conceptId -> [{strategy, worked}]

    # mastery loop
    currentAttempt: dict[str, Any]
    gradeResult: dict[str, Any]  # {verdict, score, misconception?, feedbackMd}
    remediationPlan: list[dict[str, Any]]
    sm2Updates: list[dict[str, Any]]

    # meta / control
    errors: list[dict[str, Any]]
    retryCount: int
    messages: Annotated[list[Any], add_messages]
