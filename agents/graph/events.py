"""Lightweight per-session event bus for WebSocket streaming (docs/13).

Nodes publish progress via emit() using ContextVars set by the run endpoint,
keeping agent nodes decoupled from transport.
"""

from __future__ import annotations

import asyncio
import contextvars
from typing import Any, Callable

session_id_var: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "session_id", default=None
)
bus_var: contextvars.ContextVar["EventBus | None"] = contextvars.ContextVar(
    "bus", default=None
)


class EventBus:
    """Registry of live WS connections per session."""

    def __init__(self) -> None:
        self._conns: dict[str, set[asyncio.Queue]] = {}
        self._seq: dict[str, int] = {}

    async def connect(self, session_id: str) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        self._conns.setdefault(session_id, set()).add(q)
        return q

    def disconnect(self, session_id: str, q: asyncio.Queue) -> None:
        conns = self._conns.get(session_id)
        if conns:
            conns.discard(q)
            if not conns:
                self._conns.pop(session_id, None)

    async def publish(self, session_id: str, event: dict[str, Any]) -> None:
        self._seq[session_id] = self._seq.get(session_id, 0) + 1
        event = {"seq": self._seq[session_id], **event}
        for q in list(self._conns.get(session_id, ())):
            await q.put(event)


async def emit(event: str, *, node: str | None = None, **data: Any) -> None:
    """Fire-and-forget event from inside a node (no-op outside a run)."""
    bus, sid = bus_var.get(), session_id_var.get()
    if not bus or not sid:
        return
    payload: dict[str, Any] = {"event": event}
    if node:
        payload["node"] = node
    await bus.publish(sid, {**payload, **data})


def make_timed(node_fn: Callable, name: str) -> Callable:
    """Wrap a node to emit node_start / node_end(+latencyMs)."""

    async def wrapped(state: dict) -> dict:
        import time

        await emit("node_start", node=name)
        t0 = time.perf_counter()
        result = node_fn(state)
        if asyncio.iscoroutine(result):
            result = await result
        latency_ms = int((time.perf_counter() - t0) * 1000)
        await emit("node_end", node=name, latencyMs=latency_ms)
        return result

    wrapped.__name__ = name
    return wrapped
