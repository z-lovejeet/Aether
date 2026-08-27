"""Mastery Engine — agents service entrypoint.

REST + WebSocket contracts per docs/13-api-contracts.md.
Phase 1: /sessions/{id}/run executes the LangGraph run for
action=upload_material and streams node events over /ws/{id}.
"""

from __future__ import annotations

import asyncio
import uuid
from typing import Any, Optional, Union

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from graph.events import EventBus, bus_var, session_id_var
from graph.orchestrator import ROUTES, build_graph

load_dotenv(".env")       # standard
load_dotenv(".env.local") # also accepted (matches what you created)

app = FastAPI(title="Mastery Engine Agents", version="0.3.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
graph = build_graph()
bus = EventBus()

_RUNS: dict[str, dict[str, Any]] = {}  # runId -> {status, sessionId, result}


class RunRequest(BaseModel):
    action: str = Field(..., description="intent, e.g. upload_material")
    payload: dict[str, Any] = Field(default_factory=dict)


class AttemptRequest(BaseModel):
    sessionId: str = Field(..., description="session UUID")
    quizItemId: str = Field(..., description="quiz_items.id UUID")
    responseText: str = Field(..., description="student's answer text")


class RemediationCheckRequest(BaseModel):
    sessionId: str = Field(..., description="session UUID")
    conceptId: str = Field(..., description="concept UUID being remediated")
    quizItemId: str = Field(..., description="quiz_items.id UUID for tracking")
    strategy: str = Field(..., description="current strategy being tested")
    microCheckAnswer: str = Field(..., description="expected answer for grading")
    responseText: str = Field(..., description="student's micro-check response")
    triedStrategies: list[str] = Field(default_factory=list, description="previously tried strategies")


class ChatRequest(BaseModel):
    sessionId: str = Field(..., description="session UUID or identifier")
    materialId: Optional[str] = Field(default=None, description="material UUID scope (optional, auto-resolved if absent)")
    question: str = Field(..., description="learner's question text")


class PracticeGenerateRequest(BaseModel):
    subject: str = Field(default="General", description="Subject area")
    topics: Union[list[str], str] = Field(..., description="Target topics or concepts")
    level: str = Field(default="intermediate", description="Difficulty: beginner, intermediate, advanced")
    count: int = Field(default=5, description="Number of practice questions (3 to 10)")
    goal: str = Field(default="exam", description="Learning goal: exam, deep_understanding, interview_prep, speed_review")
    qtypes: list[str] = Field(default=["mcq", "short", "explain"], description="Question types")


@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "mastery-engine-agents",
        "routes": sorted(ROUTES.keys()),
    }


async def _execute_run(run_id: str, session_id: str, req: RunRequest) -> None:
    """Execute the graph, streaming node updates to the session's WS clients."""
    from graph.events import bus_var, session_id_var  # local to keep types tight

    tokens = [
        (session_id_var, session_id_var.set(session_id)),
        (bus_var, bus_var.set(bus)),
    ]
    initial_state: dict[str, Any] = {
        "sessionId": session_id,
        "userId": "dev-user",  # TODO(phase-3): real auth identity
        "intent": req.action,
        "rawInput": req.payload.get("rawInput") or {"type": "text", "payload": req.payload},
        "learningDNA": req.payload.get("learningDNA") or {},
        "subject": req.payload.get("subject") or "General",
        "level": req.payload.get("level") or "beginner",
        "messages": [],
        "retryCount": 0,
    }
    final_update: dict[str, Any] = {}
    try:
        _RUNS[run_id]["status"] = "running"
        print(f"[run {run_id}] starting pipeline execution...")
        async for update in graph.astream(initial_state, stream_mode="updates"):
            for node_name, partial in update.items():
                print(f"[run {run_id}] ✓ node completed: {node_name}")
                if isinstance(partial, dict):
                    final_update.update(partial)
                await bus.publish(session_id, {
                    "event": "node_end",
                    "node": node_name,
                    "data": {"keys": list(partial.keys()) if isinstance(partial, dict) else []},
                })
        _RUNS[run_id].update({"status": "done", "result": {
            k: v for k, v in final_update.items() if k != "messages"
        }})
        print(f"[run {run_id}] ★ PIPELINE COMPLETED SUCCESSFULLY!")
        await bus.publish(session_id, {
            "event": "asset_ready",
            "node": "orchestrator",
            "data": {"runId": run_id, "done": True},
        })
    except NotImplementedError as err:
        _RUNS[run_id].update({"status": "unimplemented", "error": str(err)})
        await bus.publish(session_id, {"event": "error", "data": {
            "code": "NOT_IMPLEMENTED", "message": str(err), "retryable": False}})
    except Exception as err:  # noqa: BLE001
        _RUNS[run_id].update({"status": "failed", "error": str(err)})
        await bus.publish(session_id, {"event": "error", "data": {
            "code": "UPSTREAM_DOWN", "message": str(err), "retryable": True}})
    finally:
        for var, token in reversed(tokens):
            var.reset(token)


@app.post("/sessions/{session_id}/run", status_code=202)
async def run_session(
    session_id: str,
    req: RunRequest,
) -> dict[str, Any]:
    if req.action not in ROUTES:
        raise HTTPException(status_code=400, detail=f"unknown action: {req.action}")
    # TODO(phase-1b): validate Supabase JWT before executing tools.
    run_id = str(uuid.uuid4())
    _RUNS[run_id] = {"status": "queued", "sessionId": session_id}
    asyncio.create_task(_execute_run(run_id, session_id, req))
    return {"runId": run_id}


@app.get("/runs/{run_id}")
async def get_run(run_id: str) -> dict[str, Any]:
    run = _RUNS.get(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="unknown run")
    return run


@app.post("/attempts")
async def submit_attempt(req: AttemptRequest) -> dict[str, Any]:
    """Grade a student's answer synchronously (docs/13 §Submit an attempt).

    1. Fetch the quiz item from DB
    2. Grade (MCQ deterministic / short-explain LLM)
    3. Persist attempt
    4. Update SM-2 mastery schedule
    5. Trigger Remediation Coach if fail_count >= 2
    6. Return grade result + scheduling + optional remediation info
    """
    from graph.db import get_quiz_item, insert_attempt, normalize_user_id, get_mastery
    from graph.nodes.grader import grade_answer
    from graph.nodes.scheduler import update_mastery_for_grade

    # 1. Fetch quiz item
    quiz_item = await asyncio.to_thread(get_quiz_item, req.quizItemId)
    if not quiz_item:
        raise HTTPException(status_code=404, detail="quiz item not found")

    # 2. Grade the answer
    grade_result = await grade_answer(
        quiz_item=quiz_item,
        student_response=req.responseText,
        source_excerpt="",  # no source context in direct API call
    )

    # 3. Persist attempt
    user_id = normalize_user_id("dev-user")  # TODO(phase-later): real auth
    try:
        is_correct = grade_result["verdict"] == "correct"
        is_partial = grade_result["verdict"] == "partial"
        misconception_str = None
        if grade_result.get("misconception"):
            misconception_str = grade_result["misconception"].get("type")
        await asyncio.to_thread(
            insert_attempt,
            user_id,
            req.quizItemId,
            is_correct,
            is_partial,
            req.responseText,
            misconception_str,
        )
    except Exception as err:
        print(f"[attempts] persist failed: {err}")

    # 4. Update SM-2 mastery
    sm2_update = None
    concept_id = quiz_item.get("concept_id")
    if concept_id:
        try:
            sm2_update = await update_mastery_for_grade(
                concept_id, grade_result["verdict"]
            )
        except Exception as err:
            print(f"[attempts] SM-2 update failed: {err}")

    # 4b. Check if remediation is needed (fail_count >= 2 + wrong verdict)
    remediation = None
    if grade_result["verdict"] == "wrong" and concept_id:
        mastery_state = await asyncio.to_thread(get_mastery, concept_id)
        fail_count = mastery_state["fail_count"] if mastery_state else 0
        if fail_count >= 2:
            from graph.nodes.remediation_coach import run_remediation
            from graph.db import (
                get_concept_name, get_source_excerpt_for_concept,
                get_strategy_history,
            )
            c_name = await asyncio.to_thread(get_concept_name, concept_id)
            source = await asyncio.to_thread(get_source_excerpt_for_concept, concept_id)
            history = await asyncio.to_thread(get_strategy_history, concept_id)

            # Get learning DNA
            dna = None
            try:
                from graph.db import _get_conn
                import json as _json
                conn = _get_conn()
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT learning_dna FROM profiles WHERE user_id = %s",
                        (user_id,),
                    )
                    row = cur.fetchone()
                    if row:
                        dna = row[0] if isinstance(row[0], dict) else _json.loads(row[0]) if row[0] else {}
            except Exception:
                pass

            misconception = grade_result.get("misconception") or {}
            try:
                remediation = await run_remediation(
                    concept_id=concept_id,
                    concept_name=c_name or "this concept",
                    misconception_type=misconception.get("type", "partial_recall"),
                    evidence_quote=misconception.get("evidenceQuote", ""),
                    source_excerpt=source,
                    learning_dna=dna,
                    strategy_history=history,
                )
            except Exception as err:
                print(f"[attempts] remediation generation failed: {err}")

    # 5. Return result
    return {
        "grade": grade_result,
        "sm2": sm2_update,
        "remediation": remediation,
    }


@app.post("/remediation/check")
async def check_remediation(req: RemediationCheckRequest) -> dict[str, Any]:
    """Grade a micro-check response during remediation and return next step or completion.

    Flow:
    1. Grade the micro-check response
    2. If passed -> celebrate, log strategy as worked, update SM-2 with bonus, write-back Learning DNA
    3. If failed -> advance ladder, return next strategy step
    """
    from graph.db import (
        get_concept_name, get_source_excerpt_for_concept,
        get_strategy_history, normalize_user_id,
        record_strategy_attempt, update_learning_dna_best_strategy,
        get_mastery,
    )
    from graph.nodes.remediation_coach import (
        grade_micro_check, run_remediation,
        STRATEGY_LADDER, MAX_LADDER_STEPS,
    )
    from graph.nodes.scheduler import update_mastery_for_grade

    user_id = normalize_user_id("dev-user")
    c_name = await asyncio.to_thread(get_concept_name, req.conceptId)

    # 1. Grade the micro-check
    micro_result = await grade_micro_check(
        concept_name=c_name or "this concept",
        question="micro-check",
        expected_answer=req.microCheckAnswer,
        student_response=req.responseText,
    )

    # Record the attempt with strategy
    try:
        await asyncio.to_thread(
            record_strategy_attempt,
            user_id, req.quizItemId, req.strategy,
            micro_result["passed"], req.responseText,
        )
    except Exception as err:
        print(f"[remediation/check] record attempt failed: {err}")

    if micro_result["passed"]:
        # 2a. SUCCESS — concept rescued!
        # Update SM-2 with remediation bonus (from_remediation=True -> q=4)
        sm2_update = None
        try:
            sm2_update = await update_mastery_for_grade(
                req.conceptId, "correct", from_remediation=True
            )
        except Exception as err:
            print(f"[remediation/check] SM-2 update failed: {err}")

        # Write winning strategy to mastery.last_strategy
        try:
            from graph.db import update_mastery
            mastery = await asyncio.to_thread(get_mastery, req.conceptId)
            if mastery and sm2_update:
                await asyncio.to_thread(
                    update_mastery,
                    req.conceptId,
                    sm2_update["ease_factor"],
                    sm2_update["interval_days"],
                    sm2_update["repetitions"],
                    sm2_update["due_date"],
                    sm2_update["fail_count"],
                    req.strategy,  # last_strategy
                )
        except Exception as err:
            print(f"[remediation/check] mastery strategy update failed: {err}")

        # Write back to Learning DNA inferredTraits.bestStrategy
        try:
            await asyncio.to_thread(
                update_learning_dna_best_strategy, user_id, req.strategy
            )
        except Exception as err:
            print(f"[remediation/check] DNA write-back failed: {err}")

        return {
            "passed": True,
            "rescued": True,
            "feedbackMd": micro_result["feedbackMd"],
            "winningStrategy": req.strategy,
            "sm2": sm2_update,
            "celebrationMd": f"🎉 Brilliant! The **{req.strategy}** approach clicked! "
                             f"I've noted this works best for you — future explanations will lean this way.",
        }
    else:
        # 2b. FAILED — advance ladder
        step_count = len(req.triedStrategies)
        if step_count >= MAX_LADDER_STEPS:
            # All strategies exhausted — park concept
            return {
                "passed": False,
                "rescued": False,
                "feedbackMd": micro_result["feedbackMd"],
                "parked": True,
                "messageMd": "We've tried several approaches. Let's give this concept a rest "
                             "and come back tomorrow with fresh eyes. Sometimes it just needs time! 🌙",
            }

        # Get next remediation step
        source = await asyncio.to_thread(get_source_excerpt_for_concept, req.conceptId)
        history = [{"strategy": s, "worked": False} for s in req.triedStrategies]

        # Get learning DNA
        dna = None
        try:
            from graph.db import _get_conn
            import json as _json
            conn = _get_conn()
            with conn.cursor() as cur:
                cur.execute("SELECT learning_dna FROM profiles WHERE user_id = %s", (user_id,))
                row = cur.fetchone()
                if row:
                    dna = row[0] if isinstance(row[0], dict) else _json.loads(row[0]) if row[0] else {}
        except Exception:
            pass

        next_step = await run_remediation(
            concept_id=req.conceptId,
            concept_name=c_name or "this concept",
            misconception_type="partial_recall",
            evidence_quote=req.responseText[:200],
            source_excerpt=source,
            learning_dna=dna,
            strategy_history=history,
        )

        return {
            "passed": False,
            "rescued": False,
            "feedbackMd": micro_result["feedbackMd"],
            "nextStep": next_step,
        }


# ============ Phase 7: Mind Map + Progress Endpoints ============


@app.get("/materials/{material_id}/mastery-map")
async def get_mastery_map(material_id: str) -> dict[str, Any]:
    """Return concept tree with mastery data for mind map visualization.
    Each node includes: id, name, parentId, difficulty, description, and a
    nested mastery object with easeFactor, intervalDays, repetitions, dueDate,
    failCount, lastStrategy.
    """
    from graph.db import get_material_concepts_with_mastery

    nodes = await asyncio.to_thread(
        get_material_concepts_with_mastery, material_id
    )
    return {"nodes": nodes or []}


@app.get("/materials/{material_id}/progress")
async def get_progress(material_id: str) -> dict[str, Any]:
    """Return progress analytics for a material:
    - conceptProgress: per-concept mastery status list
    - strategyStats: strategy effectiveness aggregates
    - weakestConcepts: concepts needing most attention
    - overallStats: summary counts and attempt totals
    """
    from graph.db import (
        get_material_attempt_stats,
        get_material_concepts_with_mastery,
        get_material_strategy_stats,
        get_weakest_concepts,
    )

    concepts = await asyncio.to_thread(
        get_material_concepts_with_mastery, material_id
    )
    strategy_stats = await asyncio.to_thread(
        get_material_strategy_stats, material_id
    )
    weakest = await asyncio.to_thread(get_weakest_concepts, material_id, 10)
    attempt_stats = await asyncio.to_thread(
        get_material_attempt_stats, material_id
    )

    # Compute mastery summary buckets
    mastered = sum(
        1
        for c in concepts
        if c["mastery"]["repetitions"] >= 3 and c["mastery"]["failCount"] == 0
    )
    learning = sum(
        1
        for c in concepts
        if 0 < c["mastery"]["repetitions"] < 3
        and c["mastery"]["failCount"] == 0
    )
    weak = sum(1 for c in concepts if c["mastery"]["failCount"] > 0)
    new_count = sum(
        1
        for c in concepts
        if c["mastery"]["repetitions"] == 0 and c["mastery"]["failCount"] == 0
    )

    return {
        "conceptProgress": [
            {
                "conceptId": c["id"],
                "name": c["name"],
                "easeFactor": c["mastery"]["easeFactor"],
                "intervalDays": c["mastery"]["intervalDays"],
                "dueDate": c["mastery"]["dueDate"],
                "failCount": c["mastery"]["failCount"],
                "repetitions": c["mastery"]["repetitions"],
                "status": (
                    "mastered"
                    if c["mastery"]["repetitions"] >= 3
                    and c["mastery"]["failCount"] == 0
                    else "weak"
                    if c["mastery"]["failCount"] > 0
                    else "learning"
                    if c["mastery"]["repetitions"] > 0
                    else "new"
                ),
            }
            for c in concepts
        ],
        "strategyStats": strategy_stats,
        "weakestConcepts": weakest,
        "overallStats": {
            "totalConcepts": len(concepts),
            "mastered": mastered,
            "learning": learning,
            "weak": weak,
            "new": new_count,
            **attempt_stats,
        },
    }


# ============ Phase 8: Chat Tutor RAG Endpoint ============


@app.post("/chat")
async def chat(req: ChatRequest) -> dict[str, Any]:
    """Socratic Chat Tutor RAG endpoint (docs/13 §Chat).

    Retrieves grounded context from user's uploaded material, applies Learning DNA,
    and returns a tailored answer with source citations and follow-up prompts.
    """
    from graph.db import get_material_for_session, normalize_user_id
    from graph.nodes.chat_tutor import run_chat_query

    mat_id = req.materialId
    if not mat_id:
        mat_id = await asyncio.to_thread(get_material_for_session, req.sessionId)

    if not mat_id:
        raise HTTPException(
            status_code=404,
            detail="No study material found for this session. Please upload notes first.",
        )

    # Fetch user's Learning DNA
    user_id = normalize_user_id("dev-user")
    dna = None
    try:
        from graph.db import _get_conn
        import json as _json

        conn = _get_conn()
        with conn.cursor() as cur:
            cur.execute("SELECT learning_dna FROM profiles WHERE user_id = %s", (user_id,))
            row = cur.fetchone()
            if row:
                dna = row[0] if isinstance(row[0], dict) else _json.loads(row[0]) if row[0] else {}
    except Exception as err:
        print(f"[chat] DNA lookup warning: {err}")

    try:
        result = await run_chat_query(
            session_id=req.sessionId,
            material_id=mat_id,
            question=req.question,
            learning_dna=dna,
        )

        # Notify any connected WebSocket clients
        await bus.publish(req.sessionId, {
            "event": "asset_ready",
            "node": "chat_tutor",
            "data": {
                "type": "chat_answer",
                "question": req.question,
                "sourcesCount": len(result.get("sources", [])),
            },
        })

        return result
    except Exception as err:
        print(f"[chat] query execution failed: {err}")
        raise HTTPException(status_code=500, detail=f"Chat tutor error: {err}")


# ============ Practice Arena Custom Topic Generation (Groq-Powered) ============


@app.post("/practice/generate")
async def generate_practice(req: PracticeGenerateRequest) -> dict[str, Any]:
    """Dynamically generate tailored practice sets using ultra-fast Groq LPU inference."""
    from llm.groq import generate_json
    from llm.gemini import parse_json_safe
    import uuid as _uuid

    # Normalize topics
    if isinstance(req.topics, list):
        topic_str = ", ".join(req.topics)
    else:
        topic_str = str(req.topics)

    count = max(3, min(req.count, 10))
    level = req.level or "intermediate"
    subject = req.subject or "General"
    goal = req.goal or "exam"

    system_prompt = f"""You are a master academic examiner and curriculum architect.
Generate {count} high-yield, deliberate practice questions for subject="{subject}" covering topics: {topic_str}.
Student mastery level: {level}. Goal: {goal}.

RULES:
1. Mix question types: MCQs (with 4 realistic distractor misconceptions), Short Answer (1-2 sentences), and Deep Explanation / Step-by-Step Proofs.
2. For all mathematical, scientific, or algorithmic equations, ALWAYS format in standard KaTeX LaTeX math ($...$ inline, $$...$$ block).
3. Provide a clear, step-by-step explanation for why the correct answer is right and why distractors are wrong.
4. Include a conceptual hint that guides thinking without giving away the direct answer.
5. Calibrate difficulty strictly to level={level} (1=beginner, 5=advanced olympiad/graduate).

Return a STRICT JSON object:
{{
  "subject": "{subject}",
  "topics": "{topic_str}",
  "level": "{level}",
  "questions": [
    {{
      "id": "gen-1",
      "conceptName": "...",
      "qtype": "mcq",
      "question": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "answer": "A) ...",
      "explanation": "...",
      "hint": "...",
      "difficulty": 3
    }},
    {{
      "id": "gen-2",
      "conceptName": "...",
      "qtype": "short",
      "question": "...",
      "options": null,
      "answer": "...",
      "explanation": "...",
      "hint": "...",
      "difficulty": 4
    }}
  ]
}}"""

    user_payload = f"Generate {count} practice questions for {subject} covering: {topic_str}."

    try:
        raw = await generate_json(system_prompt, user_payload)
        data = parse_json_safe(raw)
        if isinstance(data, dict) and "questions" in data:
            questions = data["questions"]
        elif isinstance(data, list):
            questions = data
        else:
            questions = []

        sanitized = []
        for i, q in enumerate(questions):
            if not isinstance(q, dict):
                continue
            qid = q.get("id") or str(_uuid.uuid4())
            qtype = q.get("qtype") if q.get("qtype") in ["mcq", "short", "explain"] else "mcq"
            opts = q.get("options")
            if qtype == "mcq" and isinstance(opts, list):
                opts = [str(o) for o in opts[:6]]
            else:
                opts = None

            sanitized.append({
                "id": str(qid),
                "conceptId": f"gen-c{i+1}",
                "conceptName": q.get("conceptName") or f"Topic {i+1}",
                "subject": subject,
                "qtype": qtype,
                "question": str(q.get("question", "")),
                "options": opts,
                "answer": str(q.get("answer", "")),
                "explanation": str(q.get("explanation", "")),
                "hint": str(q.get("hint", "")),
                "difficulty": int(q.get("difficulty", 3)),
            })

        return {
            "subject": subject,
            "topics": topic_str,
            "level": level,
            "count": len(sanitized),
            "questions": sanitized,
        }
    except Exception as err:
        print(f"[practice] generation failed: {err}")
        raise HTTPException(status_code=500, detail=f"Practice generation failed: {err}")


# ============ Material & Library Management Endpoints ============


@app.get("/materials")
async def get_materials_list(limit: int = 50) -> list[dict[str, Any]]:
    """List all parsed materials stored in PostgreSQL."""
    from graph.db import list_materials
    return await asyncio.to_thread(list_materials, limit)


@app.delete("/materials/{material_id}")
async def remove_material(material_id: str) -> dict[str, Any]:
    """Delete a study material and cascade-delete all its related records."""
    from graph.db import delete_material
    success = await asyncio.to_thread(delete_material, material_id)
    if not success:
        raise HTTPException(status_code=404, detail="Material not found or invalid UUID")
    return {"deleted": True, "materialId": material_id}


@app.delete("/sessions/{session_id}")
async def remove_session(session_id: str) -> dict[str, Any]:
    """Delete an active study session and its corresponding records."""
    from graph.db import delete_session
    await asyncio.to_thread(delete_session, session_id)
    return {"deleted": True, "sessionId": session_id}


@app.websocket("/ws/{session_id}")
async def ws_events(ws: WebSocket, session_id: str) -> None:
    """Stream node_start/node_end/token/asset_ready/error events (docs/13)."""
    await ws.accept()
    q = await bus.connect(session_id)
    try:
        while True:
            event = await asyncio.wait_for(q.get(), timeout=30)
            await ws.send_json(event)
    except (asyncio.TimeoutError, TimeoutError):
        await ws.send_json({"event": "ping"})  # keepalive
    except WebSocketDisconnect:
        return
    finally:
        bus.disconnect(session_id, q)
