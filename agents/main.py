"""Mastery Engine — agents service entrypoint.

REST + WebSocket contracts per docs/13-api-contracts.md.
Auth: Supabase JWT in Authorization header (enforced from Phase 1 onward;
stubbed for local Phase 0 smoke tests).
"""

from __future__ import annotations

import asyncio
import uuid
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from graph.orchestrator import ROUTES, build_graph

load_dotenv()

app = FastAPI(title="Mastery Engine Agents", version="0.1.0")
graph = build_graph()

# runId -> {status, node_timings}; replaced by Supabase agent_runs in Phase 1
_RUNS: dict[str, dict[str, Any]] = {}


class RunRequest(BaseModel):
    action: str = Field(..., description="intent, e.g. upload_material")
    payload: dict[str, Any] = Field(default_factory=dict)


@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "mastery-engine-agents",
        "routes": sorted(ROUTES.keys()),
    }


@app.post("/sessions/{session_id}/run", status_code=202)
async def run_session(
    session_id: str,
    req: RunRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    if req.action not in ROUTES:
        raise HTTPException(status_code=400, detail=f"unknown action: {req.action}")
    # TODO(phase-1): validate Supabase JWT before any DB/tool call.
    run_id = str(uuid.uuid4())
    _RUNS[run_id] = {"status": "queued", "node_timings": {}}
    return {"runId": run_id}


@app.websocket("/ws/{session_id}")
async def ws_events(ws: WebSocket, session_id: str) -> None:
    """Streams node_start / node_end / token / asset_ready events (13-api-contracts).

    Phase 0: echo channel so the UI team can wire the pipeline indicator.
    """
    await ws.accept()
    try:
        while True:
            msg = await ws.receive_text()
            await ws.send_json(
                {"event": "echo", "sessionId": session_id, "data": msg}
            )
            await asyncio.sleep(0)  # yield to event loop
    except WebSocketDisconnect:
        return
