"""🔀 Generators Fan-out — runs Content Forge ∥ Quiz Master ∥ Flashcard Smith.

Single LangGraph node that dispatches to all three generators in parallel
via asyncio.gather, merges their partial state updates, and persists
generated quiz items and flashcards to Supabase.
"""

from __future__ import annotations

import asyncio
from typing import Any

from ..events import emit
from .content_forge import content_forge
from .flashcard_smith import flashcard_smith
from .quiz_master import quiz_master


async def generators_fanout(state: dict) -> dict:
    """Run content_forge, quiz_master, flashcard_smith in parallel."""
    await emit("node_start", node="generators_fanout")

    # Run all three generator agents concurrently
    results = await asyncio.gather(
        content_forge(state),
        quiz_master(state),
        flashcard_smith(state),
        return_exceptions=True,
    )

    merged_assets: dict[str, Any] = dict(state.get("generatedAssets") or {})
    errors: list[dict[str, Any]] = []

    for name, result in zip(["content_forge", "quiz_master", "flashcard_smith"], results):
        if isinstance(result, Exception):
            print(f"[generators_fanout] {name} failed: {result}")
            errors.append({
                "code": f"{name.upper()}_FAILED",
                "message": f"{name} generation failed: {result}",
                "retryable": True,
            })
            continue
        if isinstance(result, dict):
            assets = result.get("generatedAssets") or {}
            merged_assets.update(assets)

    # ---- DB persistence for quiz_items and flashcards ----
    concept_id_map = state.get("conceptIdMap") or {}
    quiz_items = merged_assets.get("quizItems") or []
    flashcards = merged_assets.get("flashcards") or []

    if concept_id_map and (quiz_items or flashcards):
        try:
            from .. import db

            def _persist_assets() -> tuple[list[str], list[str]]:
                qi_ids: list[str] = []
                fc_ids: list[str] = []
                if quiz_items:
                    qi_ids = db.insert_quiz_items(concept_id_map, quiz_items)
                if flashcards:
                    fc_ids = db.insert_flashcards(concept_id_map, flashcards)
                return qi_ids, fc_ids

            qi_ids, fc_ids = await asyncio.to_thread(_persist_assets)

            # Inject DB UUIDs into quiz items and flashcards for frontend
            for i, qid in enumerate(qi_ids):
                if i < len(quiz_items):
                    quiz_items[i]["id"] = qid
            for i, fid in enumerate(fc_ids):
                if i < len(flashcards):
                    flashcards[i]["id"] = fid

            # Update merged_assets with ID-enriched items
            merged_assets["quizItems"] = quiz_items
            merged_assets["flashcards"] = flashcards
        except Exception as err:
            print(f"[generators_fanout] assets persistence failed: {err}")
            from .. import db as _db
            _db.reset_conn()
            errors.append({
                "code": "ASSETS_DB_WRITE_FAILED",
                "message": f"Failed to persist quiz/flashcards to database: {err}",
                "retryable": True,
            })

    out: dict[str, Any] = {"generatedAssets": merged_assets}
    if errors:
        out["errors"] = errors

    await emit("asset_ready", node="generators_fanout", data={
        "explainer": bool(merged_assets.get("explainerMd")),
        "quiz_count": len(quiz_items),
        "flashcard_count": len(flashcards),
    })
    return out
