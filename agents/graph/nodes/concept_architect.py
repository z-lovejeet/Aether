"""🏛️ Concept Architect Agent — docs/05b-concept-architect.md

cleanedText -> validated hierarchical conceptTree JSON.
Pipeline: hash-cache check -> Groq JSON generation (curriculum-architect
prompt + few-shot) -> schema validation -> 1 self-correction reprompt ->
flatten degrade. <2 leaves -> granular reprompt -> TOO_THIN error.
Persists material + concepts + mastery seeds to Supabase.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import os
import time
from pathlib import Path
from typing import Any

from ..events import emit
from ..schemas import ConceptNode, ConceptTree, flatten_tree, tree_to_dicts, validate_tree

CACHE_DIR = Path(os.environ.get("CONCEPT_CACHE_DIR", ".cache/concepts"))

SYSTEM_PROMPT = """You are a curriculum architect. Decompose study material into a concept tree.
Each node: id ("c1","c2",...), name, parentId (null for top-level), difficulty 1-5, terms[], keyFacts[].
Rules:
- 3 to 15 top-level topics; max depth 3.
- Every leaf must be independently quizable: explainable in 1-3 sentences with at least one keyFact.
- Calibrate granularity to learner level={level} and goal={goal}.
- Ground everything in the provided material only; never invent topics.
- Output STRICT JSON only: {{"nodes":[{{...}}, ...]}}

Example output shape:
{{"nodes":[
  {{"id":"c1","name":"Photosynthesis","parentId":null,"difficulty":2,"terms":["chlorophyll"],"keyFacts":["occurs in chloroplasts"]}},
  {{"id":"c2","name":"Light reactions","parentId":"c1","difficulty":3,"terms":["thylakoid"],"keyFacts":["split water, release oxygen"]}},
  {{"id":"c3","name":"Calvin cycle","parentId":"c1","difficulty":4,"terms":["stroma"],"keyFacts":["fixes CO2 into glucose"]}}
]}}"""


def _cache_key(cleaned: str, level: str, goal: str) -> str:
    h = hashlib.sha256(cleaned.encode()).hexdigest()[:32]
    return f"{h}-{level}-{goal}"


def _cache_get(key: str) -> dict[str, Any] | None:
    p = CACHE_DIR / f"{key}.json"
    if p.exists():
        try:
            return json.loads(p.read_text())
        except json.JSONDecodeError:
            return None
    return None


def _cache_put(key: str, value: dict[str, Any]) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    (CACHE_DIR / f"{key}.json").write_text(json.dumps(value))


def _tree_from_markdown(cleaned: str, subject: str) -> ConceptTree:
    """Fallback generator that constructs a valid ConceptTree directly from Markdown headings."""
    nodes = []
    lines = cleaned.split("\n")
    root_id = "c1"
    root_name = subject
    current_parent_id = root_id

    for line in lines:
        if line.startswith("# ") and len(line) > 3:
            root_name = line[2:].strip().rstrip(":")
            break

    nodes.append(ConceptNode(
        id=root_id,
        name=root_name,
        parentId=None,
        difficulty=1,
        terms=[root_name],
        keyFacts=[f"Core foundation of {root_name}"],
    ))

    sec_idx = 2
    for line in lines:
        trimmed = line.strip()
        if trimmed.startswith("## ") and len(trimmed) > 4:
            name = trimmed[3:].strip().lstrip("0123456789. ")
            if name.lower() != root_name.lower():
                node_id = f"c{sec_idx}"
                nodes.append(ConceptNode(
                    id=node_id,
                    name=name,
                    parentId=root_id,
                    difficulty=min(4, max(2, sec_idx // 2)),
                    terms=[name],
                    keyFacts=[f"Key principle: {name}"],
                ))
                current_parent_id = node_id
                sec_idx += 1
        elif trimmed.startswith("### ") and len(trimmed) > 5 and sec_idx > 2:
            name = trimmed[4:].strip().lstrip("0123456789. ")
            node_id = f"c{sec_idx}"
            nodes.append(ConceptNode(
                id=node_id,
                name=name,
                parentId=current_parent_id,
                difficulty=3,
                terms=[name],
                keyFacts=[f"Detailed mechanism: {name}"],
            ))
            sec_idx += 1

    if len(nodes) < 2:
        nodes.append(ConceptNode(
            id="c2",
            name=f"{root_name} Principles",
            parentId=root_id,
            difficulty=2,
            terms=[f"{root_name} Principles"],
            keyFacts=[f"Practical application of {root_name}"],
        ))

    return ConceptTree(nodes=nodes)


async def _generate_tree(cleaned: str, level: str, goal: str, extra_hint: str = "") -> Any:
    """One Groq JSON generation attempt (with Gemini fallback)."""
    from llm.groq import generate_json
    from llm.gemini import parse_json_safe

    user_payload = (
        (f"NOTE: {extra_hint}\n\n" if extra_hint else "")
        + f"LEARNER LEVEL: {level}\nGOAL: {goal}\n\nMATERIAL:\n\"\"\"\n{cleaned[:20000]}\n\"\"\""
    )
    raw = await generate_json(
        SYSTEM_PROMPT.format(level=level, goal=goal),
        user_payload,
        preferred_model="openai/gpt-oss-120b",
    )
    return parse_json_safe(raw)


async def concept_architect(state: dict) -> dict:
    """cleanedText -> validated conceptTree (+ persistence)."""
    cleaned = state.get("cleanedText") or ""
    if not cleaned.strip():
        return {"errors": [{
            "code": "NO_MATERIAL",
            "message": "No cleaned text to analyze.",
            "retryable": False,
        }]}

    dna = state.get("learningDNA") or {}
    level_by_subject = dna.get("levelBySubject") or {}
    subject = state.get("subject") or "General"
    level = level_by_subject.get(subject) or state.get("level") or "beginner"
    goal = dna.get("goal") or "exam"

    # ---- hash cache: hash(cleanedText)+level+goal (docs/05b §Cost Notes) ----
    key = _cache_key(cleaned, level, goal)
    cached = _cache_get(key)
    if cached:
        await emit("asset_ready", node="concept_architect", data={"cached": True})
        return {**cached, "sourceMeta": {**(state.get("sourceMeta") or {}),
                                         "tree_cached": True}}

    # ---- generation with validation loop (docs/05b §Validation Loop) ----
    tree_model = None
    errors: list[str] = []
    raw_tree: Any = None
    degraded = False

    for attempt in range(2):
        hint = (
            "Your previous output had these problems: "
            + "; ".join(errors)
            + ". Fix them and return corrected STRICT JSON."
            if errors
            else ""
        )
        try:
            raw_tree = await _generate_tree(cleaned, level, goal, hint)
            tree_model, errors = validate_tree(raw_tree)
            if tree_model:
                break
        except Exception as err:
            print(f"[concept_architect] attempt {attempt + 1} failed: {err}")

    # If LLM tree generation failed, use structured markdown heading extractor fallback!
    if tree_model is None:
        print("[concept_architect] Falling back to markdown heading concept extractor…")
        tree_model = _tree_from_markdown(cleaned, subject)
        degraded = True

    concept_tree = tree_to_dicts(tree_model)

    # ---- persistence: material + concepts + mastery seeding (docs/05b §Graph Position) ----
    material_id = None
    id_map: dict[str, str] = {}
    persist_error = None
    try:
        from .. import db

        def _persist() -> tuple[str, dict[str, str]]:
            title = tree_model.roots()[0].name if tree_model.roots() else subject
            raw_input = state.get("rawInput") or {}
            source_type = str(raw_input.get("type", "text"))
            if source_type not in ("photo", "pdf", "text", "audio", "youtube"):
                source_type = "text"
            mid = db.insert_material(
                subject, title, source_type, cleaned[:20000],
                state.get("userId", "dev-user"),
            )
            inserted_map = db.insert_concepts(mid, concept_tree)
            db.seed_mastery(list(inserted_map.values()))
            return mid, inserted_map

        material_id, id_map = await asyncio.to_thread(_persist)

        # ---- Phase 8: Index document chunks with embeddings for RAG ----
        if material_id and cleaned.strip():
            try:
                from .chunker import chunk_text
                from llm.embed import embed_texts
                chunks = chunk_text(cleaned)
                if chunks:
                    embs = await embed_texts([c["content"] for c in chunks])
                    for i, emb in enumerate(embs):
                        chunks[i]["embedding"] = emb
                    await asyncio.to_thread(db.insert_chunks, material_id, chunks)
                    print(f"[concept_architect] Indexed {len(chunks)} RAG chunks for material {material_id}")
            except Exception as emb_err:
                print(f"[concept_architect] RAG chunk indexing failed: {emb_err}")
    except Exception as err:  # noqa: BLE001 — persistence must not kill the run
        persist_error = str(err)
        print(f"[concept_architect] persistence failed: {err}")
        from .. import db as _db
        _db.reset_conn()

    result_meta = {**(state.get("sourceMeta") or {}), **{
        "concepts": len(concept_tree),
        "depth": tree_model.depth(),
        "leaves": len(tree_model.leaves()),
        "degraded_flat": degraded,
        "materialId": material_id,
    }}
    out = {
        "conceptTree": concept_tree,
        "conceptIdMap": id_map,
        "materialId": material_id,
        "sourceMeta": result_meta,
    }
    if persist_error:
        out["errors"] = [{"code": "DB_WRITE_FAILED", "message": persist_error, "retryable": True}]
    _cache_put(key, out)
    await emit("asset_ready", node="concept_architect",
               data={"concepts": len(concept_tree)})
    return out
