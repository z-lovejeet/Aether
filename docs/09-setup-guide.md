# 09 · Setup & Environment Guide
## Mastery Engine

---

## 1. Accounts & API Keys (all free)
| Service | Where | Key/Config |
|---|---|---|
| Google AI Studio | aistudio.google.com | `GEMINI_API_KEY` (get 2 accounts for quota headroom) |
| Groq | console.groq.com | `GROQ_API_KEY` |
| Supabase | supabase.com | project URL + anon key + service-role key + Postgres connection string (enable **pgvector** extension) |
| LangSmith | smith.langchain.com | `LANGCHAIN_API_KEY`, set project `mastery-engine` |
| YouTube transcripts | none needed | npm package, no key |
| Hosting | Vercel + Fly.io/Railway free tier | deploy tokens |

## 2. Monorepo Layout
```
mastery-engine/
├── web/          Next.js 14+ (TS, Tailwind, Framer Motion)
│   └── src/{app,components/glass,components/app,lib}
├── agents/       FastAPI + LangGraph service
│   ├── graph/    (orchestrator.py, nodes/, state.py, schemas/)
│   └── main.py   (REST + WebSocket endpoints)
├── docs/
└── .env.example
```

## 3. Environment Variables
```env
# web/.env.local
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # server-only
AGENT_API_URL=http://localhost:8000

# agents/.env
GEMINI_API_KEY=...
GROQ_API_KEY=...
SUPABASE_DB_URL=postgresql://...
LANGCHAIN_API_KEY=...
LANGCHAIN_PROJECT=mastery-engine
```
Keys are server-side only; browser never sees GEMINI/GROQ keys.

## 4. Local Run
```bash
# web
cd web && npm i && npx supabase db push && npm run dev   # :3000
# agents
cd agents && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt   # fastapi uvicorn langgraph langchain-groq google-genai supabase pydantic
uvicorn main:app --reload          # :8000
```

## 5. Deploy
- web → Vercel (import repo, env vars from above)
- agents → Fly.io/Railway Dockerfile; set prod env; point `AGENT_API_URL` at it
- Supabase → run migrations; enable RLS policies from 04-data-model §2

## 6. Verification Checklist
- [ ] Auth signup/signin works
- [ ] Photo upload returns cleanedText (Ingestion live)
- [ ] LangSmith shows first traced run
- [ ] WebSocket pipeline events render in UI
