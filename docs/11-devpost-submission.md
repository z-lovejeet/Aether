# 11 · Devpost Submission Copy (pre-drafted)

---

## Title
**Mastery Engine — Remember Everything**

## Tagline
The AI study system that learns how you learn — and never lets you forget.

## About the Project
You don't fail exams because you didn't study. You fail because nobody ever taught you how to *remember*. In 1885, science discovered that ~70% of new knowledge evaporates within 24 hours — the forgetting curve — and students have been losing to it ever since.

**Mastery Engine** fights back. Photograph any textbook page, drop in a PDF or lecture recording, or paste a YouTube link — and in about sixty seconds a team of specialized AI agents builds you a complete study system: a personalized explainer, adaptive quizzes, flashcards with hints drawn from *your* interests, an interactive mind map, and printable cheat sheets.

Then the real magic starts. Every answer updates a per-concept memory model (SM-2 spaced repetition). Fail a concept twice and our Remediation Coach stops quizzing and *re-teaches it differently* — analogy, then visual, then step-by-step — until it clicks, and remembers which strategy worked for your brain.

## What Inspired Us
Maya studied four times and still got a 54. She said: *"I knew it yesterday. It just went away."* Millions of students say those nine words every day. We built the system that makes sure they never have to again.

## How We Built It
- **Multi-agent orchestration (LangGraph):** supervisor routes across 10 specialist agents — Ingestion, Concept Architect, Learning DNA, Content Forge, Quiz Master, Flashcard Smith, Grader, Remediation Coach, Scheduler, Chat Tutor — over a shared typed state with conditional edges powering the adaptive loop.
- **Model strategy:** Google Gemini Flash for multimodal ingestion (photo/audio/long docs), Groq Llama 3.x for sub-second structured generation and grading.
- **Learning science:** SM-2 spaced repetition + active recall + a strategy-ladder remediation state machine.
- **UI:** custom Apple-style Liquid Glass design system — aurora mesh gradients, bento grids, spring-physics micro-interactions, dark-first.
- **Stack:** Next.js + Tailwind + Framer Motion · FastAPI + LangGraph (+LangSmith tracing) · Supabase (Auth/Postgres/pgvector) · Vercel.

## Challenges We Ran Into
- Designing prompts that *stay grounded* in user material while personalizing tone (solved with strict grounding guardrails + verification pass).
- Making the Remediation Coach genuinely adapt rather than repeat itself louder (solved with an explicit strategy ladder + no-repeat memory).
- Keeping the whole pipeline under 60 seconds (parallel fan-out + aggressive caching).

## Accomplishments We're Proud Of
A live demo where judges can watch an AI notice a student's misconception, change its own teaching strategy, and visibly update its model of how that student learns.

## Links
- Live app · GitHub repo · 2-minute demo video
