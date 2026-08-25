# Mastery Engine — *Remember Everything.*

> The AI study system that learns how you learn — drop anything in, walk out remembering everything.
> Built for the **August AI Challenge** (Devpost) · deadline Aug 29.

## What it does
Photograph any textbook page, drop in a PDF or lecture recording, or paste a YouTube link — a team of specialized AI agents builds you a complete personalized study system in ~60 seconds: explainer, adaptive quizzes, flashcards, mind map, cheat sheet. An SM-2 spaced-repetition engine then fights the forgetting curve — fail a concept twice and the Remediation Coach re-teaches it *differently* until it clicks.

## Architecture
```
web/    Next.js 16 + TypeScript + Tailwind v4 + Framer Motion ("Liquid Glass OS" design system)
agents/ FastAPI + LangGraph multi-agent service (supervisor + 10 specialists)
supabase/  SQL migrations (Auth · Postgres · pgvector)
docs/   Full PRD, agent specs, design system, plans
```

## Quick start
```bash
# web
cd web && cp .env.example .env.local && npm install && npm run dev   # :3000

# agents
cd agents && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && uvicorn main:app --reload          # :8000
```
API keys & full setup: [`docs/09-setup-guide.md`](docs/09-setup-guide.md)

## Documentation
Start at [`docs/README.md`](docs/README.md) — PRD, brand story, architecture, data model, master agent orchestration blueprint, 10 agent specs, design system, project plan.

## Status
🚧 Phase 0 (scaffold) — see [project plan](docs/08-project-plan.md) for the phase roadmap to Aug 29.
