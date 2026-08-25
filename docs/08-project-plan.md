# 08 · Project Plan & Milestones
## Mastery Engine — deadline: Aug 29 (Devpost)

Working cadence: build with ox-alpha + Cline against these specs; every phase ends with a live deploy check (Vercel preview).

---

## Phase 0 — Docs & Scaffold *(today)* ✅/in-progress
- [x] `/docs` 01–13 written
- [ ] Monorepo scaffold: Next.js 14+ (TS, Tailwind, Framer Motion) + FastAPI LangGraph service
- [ ] Supabase project + schema migration applied + RLS policies
- [ ] Deploy skeleton to Vercel + service host; green pipeline day 1
**DoD:** empty app deployed; auth works; docs complete

## Phase 1 — Ingestion (≈1.5 d)
Photo OCR / PDF / text / audio / YouTube → cleanedText; upload UI with glass tabs
**DoD:** all 5 input types produce clean markdown in ≤30 s

## Phase 2 — Concept Architect (≈1 d)
Tree JSON generation + schema validation loop + persistence + mastery seeding
**DoD:** textbook page → valid tree ≤8 s, ≥95% first-pass validity

## Phase 3 — Learning DNA (≈1 d)
8-question wizard UI + profile storage + prompt-injection helper module used by all agents
**DoD:** profile demonstrably changes a generated paragraph's style

## Phase 4 — Generators fan-out (≈2 d)
Content Forge + Quiz Master + Flashcard Smith running parallel in LangGraph; study tabs render results
**DoD:** photo→full system ≤60 s end-to-end

## Phase 5 — Grader + SM-2 Scheduler (≈1.5 d)
Deterministic MCQ grading + LLM short-answer grading + SM-2 engine w/ tests + Review Queue page
**DoD:** quiz session updates due dates correctly; queue renders

## Phase 6 — Remediation Coach ⭐ (≈1 d)
Conditional edge, strategy ladder chat UI, Learning DNA write-back, mind-map node state changes
**DoD:** full fail×2→rescue→green-node loop demoable live

## Phase 7 — Mind Map + Progress (≈1.5 d)
React Flow mastery graph + analytics page (decay curves, strategy stats)
**DoD:** map colors reflect real mastery data

## Phase 8 — Chat Tutor RAG (≈1 d)
Chunking + embeddings + pgvector + streaming chat with citations
**DoD:** grounded answers ≤4 s with correct source chips

## Phase 9 — Polish & Teacher Mode stretch (≈2 d)
Audio lessons (TTS), XP/streak/confetti, mobile pass, empty/loading states, cheat sheet print CSS, teacher worksheets if time
**DoD:** Lighthouse ≥90 accessibility; zero broken flows on phone

## Phase 10 — Submission package (≈1 d)
README w/ hero GIF + architecture diagram, LangSmith trace screenshots, Devpost copy, 2-min video recorded & edited
**DoD:** submitted before Aug 29 with buffer

## Risk Buffers
| Risk | Mitigation |
|---|---|
| LangGraph/Python friction | LangGraph.js fallback inside Next.js routes |
| Latency too slow for wow | pre-generate assets during processing animation; cache aggressively |
| Scope creep | P2 items only after P0–P6 done |
| API quota | key rotation across two Google accounts; Groq rate-limit aware backoff |
