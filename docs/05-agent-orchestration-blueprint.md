# 05 · Master Agent Orchestration Blueprint
## Mastery Engine · LangGraph Multi-Agent System

---

## 1. Why Agents (not direct API calls)
- **Supervisor routing** handles messy reality (bad scans, mixed inputs) dynamically instead of a brittle fixed pipeline.
- **Shared typed GraphState** gives every specialist full context without giant prompts.
- **Conditional edges** make the adaptive remediation loop *structural*, not bolted on.
- **Parallel fan-out** cuts generation latency ~3×.
- Small specialist prompts → higher output quality than one mega-prompt.

## 2. Topology (Supervisor + Specialists)

```
                        ┌──────────────────────────────┐
   user action ────────▶│ 🎩 ORCHESTRATOR (supervisor) │
                        └──────────────┬───────────────┘
        ┌──────────┬─────────┬────────┴───┬──────────┬────────────┐
        ▼          ▼         ▼            ▼          ▼            ▼
  🔍Ingestion 🏛️Concept  🧬Learning  ✍️Content  🎯Quiz⇄⚖️Grader  🩺Remediation
    Agent     Architect   DNA Agent   Forge      🃏Flashcards    Coach
                                                          │
                              💬Chat Tutor ←──────────────┴──▶ 📅Scheduler(SM-2)
                                        shared Supabase persistence ◀────┘
```

## 3. Global GraphState
See `04-data-model.md §1`. Every node is a pure-ish function `state → Partial<state>`; all side effects (DB writes) happen in typed tool calls so runs stay checkpointable.

## 4. Supervisor Routing Table

| Trigger / intent | Route to | Notes |
|---|---|---|
| `upload_material` | ingestion_agent | detects type, extracts text |
| `material_parsed` | concept_architect | builds concept tree |
| `concepts_ready` | content_forge ∥ quiz_master ∥ flashcard_smith | **parallel fan-out**, join on completion |
| `quiz_submitted` | grader | fast path |
| grade = wrong & fail_count ≥ 2 | remediation_coach | **conditional edge** |
| grade = pass/partial-ok | scheduler_agent | SM-2 update |
| `review_due` | scheduler_agent | daily queue build |
| `chat_question` | chat_tutor | RAG |
| session end / trait signal | learning_dna_agent | profile update |

Pseudo-code:
```python
def route(state) -> str:
    return ROUTES[classify_intent(state)]   # dict in §4 table
graph.add_conditional_edges("orchestrator", route, ROUTES.values())
```

## 5. Model Assignment Matrix

| Task class | Engine | Why |
|---|---|---|
| Vision OCR, audio transcription, long-context parsing | Gemini Flash | multimodal, huge context |
| Structured generation (trees/quizzes/cards) | Groq Llama 3.x JSON mode | sub-second, schema-reliable |
| Free-text grading, remediation dialogue | Groq (fast) → Gemini (fallback) | speed first |
| Embeddings | Gemini embeddings → pgvector | free, integrated |

## 6. Cross-Cutting Concerns
- **Guardrails:** every agent output validated against JSON schema; invalid → 1 self-correction reprompt → fallback path. Prompt-injection shield: user text wrapped as untrusted data.
- **Fallbacks:** Groq↓→Gemini; Gemini Vision↓→Tesseract; total failure→graceful UI error + checkpoint resume.
- **Checkpointer:** LangGraph Postgres checkpointer ↔ `agent_runs` table (sessions survive refresh).
- **Observability:** LangSmith tracing on every run; per-node latency/token logs surfaced to the UI pipeline indicator.
- **Budgets:** per-agent token caps; concept trees cached per material hash.
- **Human-in-the-loop:** Teacher Mode outputs require explicit teacher approval before export.

## 7. Latency Budget (targets)
ingest ≤ 8 s · concepts ≤ 8 s · parallel assets ≤ 12 s · grading ≤ 1.5 s · remediation first line ≤ 2 s. Total upload→study ≤ 60 s.

## 8. Agent Document Index
| File | Agent | One-line mission |
|---|---|---|
| 05a-ingestion-agent.md | 🔍 Ingestion | any input → clean structured text |
| 05b-concept-architect.md | 🏛️ Concept Architect | text → hierarchical concept tree |
| 05c-learning-dna-agent.md | 🧬 Learning DNA | owns & evolves the learner profile |
| 05d-content-forge.md | ✍️ Content Forge | personalized explainer + cheat sheet |
| 05e-quiz-master.md | 🎯 Quiz Master | adaptive quizzes |
| 05f-flashcard-smith.md | 🃏 Flashcard Smith | cards w/ interest-based hints |
| 05g-grader.md | ⚖️ Grader | verdicts + misconception detection |
| 05h-remediation-coach.md | 🩺 Remediation Coach ⭐ | strategy-ladder re-teaching loop |
| 05i-scheduler.md | 📅 Scheduler | deterministic SM-2 engine |
| 05j-chat-tutor.md | 💬 Chat Tutor | RAG Q&A over user's materials |
