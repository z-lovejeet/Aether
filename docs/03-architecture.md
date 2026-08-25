# 03 · Technical Architecture
## Mastery Engine

---

## 1. High-Level System

```
┌───────────────────────────────┐        ┌─────────────────────────────────┐
│  Next.js 14+ App Router       │  REST  │  FastAPI (Python)               │
│  - All UI / pages             │◀──────▶│  - LangGraph agent application   │
│  - Framer Motion design sys   │  +WS   │  - Supervisor + 10 specialists   │
│  - BFF API routes (secrets)   │ stream │  - LangSmith tracing             │
└──────────┬────────────────────┘        └──────┬──────────────────────────┘
           │                                    │
           ▼                                    ▼
   ┌───────────────┐                    ┌─────────────────────────────┐
   │ Supabase      │                    │ External AI (server-side)    │
   │ - Postgres    │                    │ - Gemini (AI Studio): vision,│
   │ - Auth        │                    │   audio, long context        │
   │ - Storage     │                    │ - Groq: Llama 3.x fast JSON  │
   │ - pgvector    │                    │ - Free TTS via Web Speech API│
   └───────────────┘                    └─────────────────────────────┘
```

**Why this split:** LangGraph is Python-native; the UI is Next.js. A small FastAPI sidecar hosts the agent graph; Next.js talks to it over REST + WebSocket (streamed agent-progress events power the live "agents working" UI). All AI keys stay server-side (FastAPI env), never in the browser.

## 2. Request Flow Examples

### Upload flow
```
User uploads photo → Next.js BFF route → stores raw file in Supabase Storage
→ POST /sessions/:id/run {action:"upload_material"} → FastAPI starts LangGraph run
→ Ingestion Agent → Concept Architect → Content Forge ∥ Quiz Master ∥ Flashcard Smith
→ results persisted per-node → WebSocket streams node status to UI pipeline indicator
```

### Quiz answer flow
```
Answer submitted → POST /attempts → Grader Agent (Groq, <1.5s target)
→ pass  → Scheduler Agent updates SM-2 → returns next question
→ fail  → conditional edge → Remediation Coach → strategy ladder step-up
        → updated Learning DNA persisted
```

## 3. Technology Decisions

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | Next.js 14+ (App Router, TS) | One codebase UI+BFF; judge-friendly repo |
| Styling | Tailwind CSS + custom Liquid Glass primitives | Full visual control; no kit defaults |
| Motion | Framer Motion | Spring physics, shared-element morphs |
| DB/Auth/Storage | Supabase free tier | Hosted Postgres + Auth + Storage + pgvector |
| Agent framework | LangGraph (Python) + LangSmith tracing | Supervisor routing, conditional edges, checkpointing |
| Heavy multimodal LLM | Gemini Flash (AI Studio key) | Photo OCR, audio, long PDFs in one API |
| Fast LLM | Groq (Llama 3.x, JSON mode) | Sub-second structured generation |
| Embeddings/RAG | Gemini embeddings → Supabase pgvector | Free, integrated |
| Hosting | Vercel (web) + Fly.io/Railway free (FastAPI) | Live URLs for submission |

## 4. Security
- All model keys server-side only (FastAPI env vars); browser never sees keys
- Supabase Row Level Security: users read/write only their own rows
- File upload validation (type + size ≤ 15 MB)
- Rate limiting per user on agent endpoints (token budget guard)

## 5. Reliability & Fallbacks
| Failure | Mitigation |
|---|---|
| Groq unavailable | Route generation to Gemini Flash |
| Gemini Vision down | Tesseract OCR fallback for photos |
| Invalid LLM JSON | Schema validation → self-correction reprompt (1 retry) → graceful error state |
| Agent timeout (>30 s) | Checkpointed LangGraph resume; partial assets still usable |

## 6. Observability
- LangSmith traces per run (free tier) — screenshot real traces for README
- Structured logs per agent node (input size, latency, token count)
- Latency counters exposed in UI during processing (demo credibility)

## 7. Environments
- `dev`: local Next.js + local FastAPI (uvicorn --reload), Supabase staging project
- `prod`: Vercel + hosted FastAPI, Supabase prod project
- Config via `.env` (see `09-setup-guide.md`)
