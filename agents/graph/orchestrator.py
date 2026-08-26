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
    "answer_question": "grader",  # Phase 5: quiz grading intent
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
    """Assemble the supervisor graph. Specialists are stubs except those
    implemented in graph/nodes/* (Phase 1: ingestion)."""
    from .events import make_timed
    from .nodes.concept_architect import concept_architect as _architect
    from .nodes.generators_fanout import generators_fanout as _generators
    from .nodes.grader import grader as _grader
    from .nodes.ingestion import ingestion_agent as _ingestion
    from .nodes.learning_dna import learning_dna_agent as _learning_dna
    from .nodes.remediation_coach import remediation_coach as _remediation_coach
    from .nodes.scheduler import scheduler_agent as _scheduler

    graph = StateGraph(MasteryState)

    # Phase 1-6: real implementations
    graph.add_node("ingestion_agent", make_timed(_ingestion, "ingestion_agent"))
    graph.add_node("concept_architect", make_timed(_architect, "concept_architect"))
    graph.add_node(
        "learning_dna_agent", make_timed(_learning_dna, "learning_dna_agent")
    )
    graph.add_node(
        "generators_fanout", make_timed(_generators, "generators_fanout")
    )
    graph.add_node("grader", make_timed(_grader, "grader"))
    graph.add_node(
        "remediation_coach", make_timed(_remediation_coach, "remediation_coach")
    )
    graph.add_node("scheduler_agent", make_timed(_scheduler, "scheduler_agent"))

    for name, spec in SPECIALISTS:
        if name in (
            "ingestion_agent",
            "concept_architect",
            "learning_dna_agent",
            "generators_fanout",
            "content_forge",
            "quiz_master",
            "flashcard_smith",
            "grader",
            "remediation_coach",
            "scheduler_agent",
        ):
            continue  # real implementations registered above
        graph.add_node(name, _stub_node(name, spec))

    # entry: supervisor routes by intent
    graph.set_conditional_entry_point(route)

    # conditional edge: grader -> remediation_coach on fail×2, else scheduler
    def after_grade(state: MasteryState) -> str:
        g = state.get("gradeResult") or {}
        if g.get("verdict") == "wrong":
            if g.get("fail_count", 0) >= 2:
                return "remediation_coach"
        return "scheduler_agent"

    graph.add_conditional_edges("grader", after_grade)

    # linear handoffs
    def after_ingest(state: MasteryState) -> str:
        if state.get("cleanedText", "").strip():
            return "concept_architect"
        return END

    graph.add_conditional_edges("ingestion_agent", after_ingest)
    graph.add_edge("concept_architect", "generators_fanout")
    graph.add_edge("generators_fanout", END)

    def after_remediation(state: MasteryState) -> str:
        plan = state.get("remediationPlan") or []
        if plan and any(p.get("rescued") for p in plan):
            return "learning_dna_agent"  # write back winning strategy
        return "scheduler_agent"

    graph.add_conditional_edges("remediation_coach", after_remediation)
    for terminal in ("scheduler_agent", "chat_tutor", "learning_dna_agent"):
        graph.add_edge(terminal, END)

    # TODO(phase-5): Postgres checkpointer via Supabase (blueprint §6)
    return graph.compile()


# Model assignment matrix lives in blueprint §5; helpers land with Phase 1.
GROQ_MODEL = os.getenv("GROQ_MODEL") or "openai/gpt-oss-120b"
GEMINI_MODEL = os.getenv("GEMINI_MODEL") or "gemini-3.7-flash"
