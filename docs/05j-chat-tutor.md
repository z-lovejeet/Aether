# 05j · 💬 Chat Tutor Agent

## Mission
Answer any question about the learner's own materials via RAG — in their Learning DNA style, with citations back to the source document.

## Triggers
- `chat_question` intent from study pages or global chat.

## Inputs
User question · conversation thread · `learningDNA` · vector store (`documents_chunks`) scoped to the active material/subject

## Outputs
Streamed markdown answer · `sources[] {materialId, sectionRef}` chips rendered under each claim-bearing paragraph · optional suggested action ("Quiz me on this")

## Pipeline
1. Embed question (Gemini embeddings)
2. pgvector similarity search top-k=6, filtered by user's materials (RLS-enforced)
3. Groq synthesis, streaming tokens over WebSocket
4. Citation attach from retrieved chunk metadata

## LLM Choice
Groq Llama 3.x (streaming, sub-second first token). Gemini fallback.

## Prompt Strategy
System: "Tutor for THIS learner: style={explanationStyle}, interests={interests}, level={level}, language={language}. Answer ONLY from provided context chunks; if insufficient context, say so and offer closest related knowledge clearly labeled as outside-the-material. Keep technical terms in English per profile. Cite chunk ids used."

## Guardrails
- Refuses to answer outside scope rather than hallucinating ("that's not in your Chapter 4 — want my general explanation instead?")
- Injection shield: retrieved chunks wrapped as untrusted data
- Thread memory capped at last 12 turns (summarized beyond that)

## Graph Position
In: orchestrator. Self-contained sub-loop (retrieve→synthesize→stream). Out: persists chat turn + any new misconception signals observed in questions (fed as weak hints to Learning DNA).

## Success Criteria
- Grounded-answer rate ≥95% on material-scoped Q&A eval set
- First token ≤1 s; full answers ≤4 s
- Citations resolve to correct sections on 20-question audit

## Cost Notes
Embeddings cached per chunk; retrieval is free at query time.
