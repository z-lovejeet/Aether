"""💬 Chat Tutor Agent — docs/05j-chat-tutor.md

Socratic RAG Q&A over user's uploaded study materials.
Pipeline:
1. Embed question (Gemini 768-dim embeddings)
2. pgvector similarity search (top-k=6, scoped to material)
3. Groq synthesis in Learning DNA style with Gemini fallback
4. Citation attachment with source chips + follow-up action suggestions
"""

from __future__ import annotations

import asyncio
import json
import re
from typing import Any

from ..events import emit
from ..state import MasteryState

# In-memory thread memory per session (capped at last 12 turns per spec)
_THREAD_HISTORY: dict[str, list[dict[str, str]]] = {}
MAX_THREAD_TURNS = 12
TOP_K_CHUNKS = 6

SYSTEM_PROMPT_TEMPLATE = """You are Aether, an expert Socratic AI tutor for THIS specific learner.

Learner Profile (Learning DNA):
- Explanation Style: {explanation_style}
- Interests & Metaphor Hooks: {interests}
- Subject Proficiency Level: {level}
- Preferred Language: {language}

RULES FOR ANSWERING:
1. Ground your answer PRIMARILY in the provided CONTEXT CHUNKS from the learner's uploaded study materials.
2. If the context chunks contain the answer, explain it clearly using their preferred explanation style ({explanation_style}) and weave in subtle analogies or examples from their interests ({interests}) if helpful.
3. If the context chunks do NOT contain enough information to fully answer the question, clearly state: "This specific detail isn't in your uploaded notes — here is a general explanation based on standard knowledge:" and clearly distinguish outside knowledge.
4. Keep technical terminology and core formulas accurate in English per profile.
5. In your answer, reference chunks where relevant by citing [chunk_1], [chunk_2], etc., corresponding to the chunk numbers provided.
6. Tone: Encouraging, intellectually engaging, concise, and pedagogical. Ask a thoughtful follow-up Socratic question at the end to reinforce active recall.
7. Length: 120-250 words. Avoid filler or robotic introductory phrasing.

CONTEXT CHUNKS:
\"\"\"
{chunks_context}
\"\"\"
"""


def _format_chunks_for_prompt(chunks: list[dict[str, Any]]) -> str:
    if not chunks:
        return "No specific document chunks available."
    formatted = []
    for i, c in enumerate(chunks):
        sec = c.get("metadata", {}).get("section_ref", f"Section {i+1}")
        content = c.get("content", "").strip()
        formatted.append(f"--- [chunk_{i+1}] (Section: {sec}) ---\n{content}")
    return "\n\n".join(formatted)


def _format_history_for_prompt(history: list[dict[str, str]]) -> str:
    if not history:
        return ""
    lines = []
    for turn in history[-MAX_THREAD_TURNS:]:
        role = "Student" if turn.get("role") == "user" else "Tutor"
        lines.append(f"{role}: {turn.get('content', '')}")
    return "\n".join(lines)


def _resolve_citations(
    answer: str,
    chunks: list[dict[str, Any]],
    material_id: str,
) -> list[dict[str, Any]]:
    """Find referenced [chunk_N] citations in the answer and map to source chips."""
    cited_indices = set()
    matches = re.findall(r"\[chunk_(\d+)\]", answer)
    for m in matches:
        try:
            idx = int(m) - 1
            if 0 <= idx < len(chunks):
                cited_indices.add(idx)
        except ValueError:
            pass

    # If no explicit citations were matched, include top-ranked chunks as sources
    if not cited_indices and chunks:
        cited_indices = {0}
        if len(chunks) > 1 and chunks[1].get("similarity", 0) > 0.6:
            cited_indices.add(1)

    sources = []
    for idx in sorted(cited_indices):
        c = chunks[idx]
        sec = c.get("metadata", {}).get("section_ref", f"Section {idx+1}")
        content = c.get("content", "")
        excerpt = (content[:120] + "...") if len(content) > 120 else content
        sources.append({
            "chunkId": c.get("id", f"chunk-{idx}"),
            "materialId": material_id,
            "sectionRef": sec,
            "excerpt": excerpt,
            "similarity": round(c.get("similarity", 0.7), 3),
        })
    return sources


async def synthesize_answer(
    system_prompt: str,
    user_prompt: str,
) -> str:
    """Generate tutor response using Groq Llama with Gemini fallback."""
    from llm.groq import _groq_generate
    from llm.gemini import _generate

    try:
        return await _groq_generate(system_prompt, user_prompt)
    except Exception as groq_err:
        print(f"[chat_tutor] Groq synthesis failed ({groq_err}), trying Gemini fallback…")
        try:
            combined = f"{system_prompt}\n\nUser Question:\n{user_prompt}"
            return await _generate([combined])
        except Exception as gemini_err:
            raise RuntimeError(f"All LLM synthesis failed in chat tutor: {gemini_err}")


async def run_chat_query(
    session_id: str,
    material_id: str,
    question: str,
    learning_dna: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Standalone RAG execution for POST /chat endpoint."""
    from llm.embed import embed_query
    from ..db import search_chunks

    dna = learning_dna or {}
    style = dna.get("explanationStyle") or "analogies"
    interests = ", ".join(dna.get("interests") or ["practical examples"])
    level = dna.get("level") or "intermediate"
    language = dna.get("language") or "English"

    # 1. Embed query
    query_emb = []
    try:
        query_emb = await embed_query(question)
    except Exception as emb_err:
        print(f"[chat_tutor] query embedding failed: {emb_err}")

    # 2. Vector search top-k chunks
    chunks = await asyncio.to_thread(search_chunks, material_id, query_emb, TOP_K_CHUNKS)

    # 3. Retrieve conversation history
    history = _THREAD_HISTORY.setdefault(session_id, [])

    # 4. Build prompt
    chunks_context = _format_chunks_for_prompt(chunks)
    history_text = _format_history_for_prompt(history)

    sys_prompt = SYSTEM_PROMPT_TEMPLATE.format(
        explanation_style=style,
        interests=interests,
        level=level,
        language=language,
        chunks_context=chunks_context,
    )

    user_prompt = question
    if history_text:
        user_prompt = f"Previous Conversation:\n{history_text}\n\nCurrent Question: {question}"

    # 5. Synthesize answer
    raw_answer = await synthesize_answer(sys_prompt, user_prompt)

    # 6. Extract citations & clean answer
    sources = _resolve_citations(raw_answer, chunks, material_id)
    cleaned_answer = re.sub(r"\[chunk_(\d+)\]", r"", raw_answer).strip()
    cleaned_answer = re.sub(r"  +", " ", cleaned_answer)

    # 7. Update thread history
    history.append({"role": "user", "content": question})
    history.append({"role": "assistant", "content": cleaned_answer})
    if len(history) > MAX_THREAD_TURNS * 2:
        _THREAD_HISTORY[session_id] = history[-MAX_THREAD_TURNS * 2 :]

    # 8. Suggested action
    suggested_action = "Quiz me on this" if len(sources) > 0 else None

    return {
        "answerMd": cleaned_answer,
        "sources": sources,
        "suggestedAction": suggested_action,
    }


async def chat_tutor(state: MasteryState) -> dict[str, Any]:
    """LangGraph node implementation for Chat Tutor specialist."""
    session_id = state.get("sessionId", "default-session")
    material_id = state.get("materialId", "")
    question = ""

    # Extract question from rawInput or messages
    raw_input = state.get("rawInput") or {}
    if isinstance(raw_input, dict) and "payload" in raw_input:
        payload = raw_input["payload"]
        if isinstance(payload, dict):
            question = str(payload.get("question", ""))
        elif isinstance(payload, str):
            question = payload

    if not question:
        msgs = state.get("messages") or []
        if msgs:
            last_msg = msgs[-1]
            question = getattr(last_msg, "content", str(last_msg))

    if not question:
        return {"errors": [{"code": "NO_QUESTION", "message": "No chat question provided."}]}

    if not material_id:
        from ..db import get_material_for_session
        material_id = await asyncio.to_thread(get_material_for_session, session_id) or ""

    result = await run_chat_query(
        session_id=session_id,
        material_id=material_id,
        question=question,
        learning_dna=state.get("learningDNA"),
    )

    await emit(
        "asset_ready",
        node="chat_tutor",
        data={"type": "chat_answer", "sources": len(result.get("sources", []))},
    )

    return {
        "generatedAssets": {
            **(state.get("generatedAssets") or {}),
            "lastChatAnswer": result,
        }
    }
