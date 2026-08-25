"""Orchestrator — Supervisor pattern over specialist agents.

Topology per docs/05-agent-orchestration-blueprint.md §4.
Each specialist is stubbed here and implemented in graph/nodes/*;
node bodies raise NotImplementedError with a pointer to their spec doc.
"""

from __future__ import annotations

import os

from langgraph.graph import END, StateGraph

from .state import MasteryState

# Routing table — blueprint §4
ROUTES = {
    "upload_material": "ingestion_agent",
    "material_parsed": "concept_architect",
    "concepts_ready": "content_forge",  # fan-out w/ quiz_master + flashcard_smith
    "quiz_submitted": "grader",
    "grade_failed": "remediation_coach",  # conditional edge from grader
    "grade_passed": "scheduler_agent",
    "review_due": "scheduler_agent",
    "chat_question": "chat_tutor",
    "profile_update": "learning_dna_agent",
}

SPECIALISTS = [
    ("ingestion_agent", "docs/05a-ingestion-agent.md"),
    ("concept_architect", "docs/05b-concept-architect.md"),
    ("learning_dna_agent", "docs/05c-learning-dna-agent.md"),
    ("content_forge", "docs/05d-content-forge.md"),
    ("quiz_master", "docs/05e-quiz-master.md"),
    ("flashcard_smith", "docs/05f-flashcard-smith.md"),
    ("grader", "docs/05g-grader.md"),
    ("remediation_coach", "docs/05h-remediation-coach.md"),
    ("scheduler_agent", "docs/05i-scheduler.md"),
    ("chat_tutor", "docs/05j-chat-tutor.md"),
]


def _stub_node(name: str, spec: str):
    def node(state: MasteryState) -> dict:
        raise NotImplementedError(
            f"{name} is not implemented yet — see {spec}"
        )

    node.__name__ = name
    return node


def route(state: MasteryState) -> str:
    """Supervisor routing function (blueprint §4)."""
    return ROUTES.get(str(state.get("intent")), END)


def build_graph():
    """Assemble the supervisor graph. Specialists are wired as stub nodes so
    the topology, conditional edges, and checkpointer are testable before any
    agent logic lands."""
    graph = StateGraph(MasteryState)

    for name, spec in SPECIALISTS:
        graph.add_node(name, _stub_node(name, spec))

    # entry: supervisor routes by intent
    graph.set_conditional_entry_point(route, path_prefix=None)

    # conditional edge: grader -> remediation_coach on fail x2, else scheduler
    def after_grade(state: MasteryState) -> str:
        g = state.get("gradeResult") or {}
        return (
            "remediation_coach"
            if g.get("verdict") == "wrong"
            else "scheduler_agent"
        )

    graph.add_conditional_edges("grader", after_grade)

    # linear handoffs
    graph.add_edge("ingestion_agent", "concept_architect")
    graph.add_edge("remediation_coach", "scheduler_agent")
    for terminal in ("scheduler_agent", "chat_tutor", "learning_dna_agent"):
        graph.add_edge(terminal, END)

    # TODO(phase-5): Postgres checkpointer via Supabase (blueprint §6)
    return graph.compile()


# Model assignment matrix lives in blueprint §5; helpers land with Phase 1.
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
