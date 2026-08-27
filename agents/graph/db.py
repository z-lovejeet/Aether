"""Supabase Postgres persistence (docs/04-data-model.md §2).

Uses SUPABASE_DB_URL (psycopg) — server-side only, bypasses RLS like any
direct DB connection; user scoping enforced by callers passing userId.

Sync psycopg calls wrapped in asyncio.to_thread by node code.
"""

from __future__ import annotations

import os
from typing import Any
from dotenv import load_dotenv

load_dotenv(".env")
load_dotenv(".env.local")

_conn = None

DEV_USER_ID = "00000000-0000-0000-0000-000000000000"


def normalize_user_id(user_id: str | None) -> str:
    """Ensure user_id is a valid UUID; default to DEV_USER_ID if invalid/dev-user."""
    import uuid as _uuid

    if not user_id or user_id == "dev-user":
        return DEV_USER_ID
    try:
        return str(_uuid.UUID(str(user_id)))
    except (ValueError, TypeError):
        return DEV_USER_ID


def _ensure_user_exists(cur, user_id: str) -> None:
    """Ensure user_id exists in auth.users and profiles so foreign keys hold."""
    try:
        cur.execute(
            """
            INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
            VALUES (%s, 'authenticated', 'authenticated', 'user@masteryengine.local', 'fake-pass', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
            ON CONFLICT (id) DO NOTHING
            """,
            (user_id,),
        )
        cur.execute(
            """
            INSERT INTO profiles (user_id, learning_dna, last_active)
            VALUES (%s, '{}'::jsonb, current_date)
            ON CONFLICT (user_id) DO NOTHING
            """,
            (user_id,),
        )
    except Exception:  # noqa: BLE001
        pass


def _get_conn():
    global _conn
    import psycopg

    url = os.environ.get("SUPABASE_DB_URL")
    if not url:
        raise RuntimeError("SUPABASE_DB_URL missing from agents/.env.local")

    if _conn is None or getattr(_conn, "closed", False):
        _conn = psycopg.connect(url, autocommit=True, prepare_threshold=None)
        return _conn

    try:
        with _conn.cursor() as cur:
            cur.execute("SELECT 1")
    except Exception:
        reset_conn()
        _conn = psycopg.connect(url, autocommit=True, prepare_threshold=None)
    return _conn


def reset_conn() -> None:
    """Drop cached connection (call on auth/conn failures)."""
    global _conn
    try:
        if _conn is not None:
            _conn.close()
    except Exception:  # noqa: BLE001
        pass
    _conn = None


def insert_material(
    subject_name: str, title: str, source_type: str, raw_text: str, user_id: str
) -> str:
    """Create subject (if new) + material row. Returns material id."""
    user_id = normalize_user_id(user_id)
    conn = _get_conn()
    with conn.cursor() as cur:
        _ensure_user_exists(cur, user_id)
        cur.execute(
            "select id from subjects where user_id=%s and name=%s "
            "order by created_at asc limit 1",
            (user_id, subject_name),
        )
        row = cur.fetchone()
        if row:
            subject_id = row[0]
        else:
            cur.execute(
                "insert into subjects (user_id, name) values (%s, %s) returning id",
                (user_id, subject_name),
            )
            subject_id = cur.fetchone()[0]

        cur.execute(
            "insert into materials (subject_id, title, source_type, raw_text) "
            "values (%s, %s, %s, %s) returning id",
            (subject_id, title[:200], source_type, raw_text),
        )
        material_id = cur.fetchone()[0]
    return str(material_id)


def insert_concepts(material_id: str, nodes: list[dict[str, Any]]) -> dict[str, str]:
    """Insert concept rows; maps llm node ids -> db uuids."""
    import uuid as _uuid

    conn = _get_conn()
    id_map: dict[str, str] = {}
    with conn.cursor() as cur:
        # two passes so parents exist before children reference them
        for pass_number in range(2):
            for n in nodes:
                if n["id"] in id_map:
                    continue
                parent_db = (
                    id_map.get(n["parentId"]) if n.get("parentId") else None
                )
                # second pass resolves children whose parents now exist
                if n.get("parentId") and not parent_db and pass_number == 0:
                    continue
                db_id = str(_uuid.uuid4())
                cur.execute(
                    "insert into concepts (id, material_id, parent_id, name, "
                    "description, difficulty) values (%s,%s,%s,%s,%s,%s)",
                    (
                        db_id,
                        material_id,
                        parent_db,
                        n["name"],
                        "; ".join(n.get("keyFacts", []))[:1000],
                        n.get("difficulty", 3),
                    ),
                )
                id_map[n["id"]] = db_id
    return id_map


def seed_mastery(concept_db_ids: list[str]) -> None:
    """SM-2 defaults per docs/04 §3: EF=2.5, due today, reps=0."""
    conn = _get_conn()
    with conn.cursor() as cur:
        for cid in concept_db_ids:
            cur.execute(
                "insert into mastery (concept_id) values (%s) "
                "on conflict (concept_id) do nothing",
                (cid,),
            )


def insert_quiz_items(concept_db_map: dict[str, str], items: list[dict]) -> list[str]:
    """Insert quiz items into quiz_items table. Returns list of DB UUIDs.
    concept_db_map maps LLM concept IDs (c1, c2...) -> DB UUIDs."""
    import json as _json
    import uuid as _uuid

    conn = _get_conn()
    inserted_ids: list[str] = []
    with conn.cursor() as cur:
        for item in items:
            llm_concept_id = item.get("conceptId", "")
            db_concept_id = concept_db_map.get(llm_concept_id)
            if not db_concept_id:
                if concept_db_map:
                    db_concept_id = list(concept_db_map.values())[0]
                else:
                    continue

            qid = str(_uuid.uuid4())
            options = item.get("options")
            cur.execute(
                """
                INSERT INTO quiz_items (id, concept_id, question, options, answer, qtype, difficulty)
                VALUES (%s, %s, %s, %s::jsonb, %s, %s, %s)
                """,
                (
                    qid,
                    db_concept_id,
                    item.get("question", "")[:2000],
                    _json.dumps(options) if options else None,
                    item.get("answer", "")[:2000],
                    item.get("qtype", "short"),
                    max(1, min(5, int(item.get("difficulty", 3)))),
                ),
            )
            inserted_ids.append(qid)
    return inserted_ids


def insert_flashcards(concept_db_map: dict[str, str], cards: list[dict]) -> list[str]:
    """Insert flashcards into flashcards table. Returns list of DB UUIDs."""
    import uuid as _uuid

    conn = _get_conn()
    inserted_ids: list[str] = []
    with conn.cursor() as cur:
        for card in cards:
            llm_concept_id = card.get("conceptId", "")
            db_concept_id = concept_db_map.get(llm_concept_id)
            if not db_concept_id:
                if concept_db_map:
                    db_concept_id = list(concept_db_map.values())[0]
                else:
                    continue

            fid = str(_uuid.uuid4())
            cur.execute(
                """
                INSERT INTO flashcards (id, concept_id, front, back, hint)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    fid,
                    db_concept_id,
                    card.get("front", "")[:500],
                    card.get("back", "")[:1000],
                    card.get("hint", "")[:500],
                ),
            )
            inserted_ids.append(fid)
    return inserted_ids


def upsert_profile(user_id: str, learning_dna: dict) -> None:
    """Insert or update the user's learning DNA profile."""
    import json as _json

    user_id = normalize_user_id(user_id)
    conn = _get_conn()
    with conn.cursor() as cur:
        _ensure_user_exists(cur, user_id)
        cur.execute(
            """
            INSERT INTO profiles (user_id, learning_dna, last_active)
            VALUES (%s, %s::jsonb, current_date)
            ON CONFLICT (user_id) DO UPDATE
            SET learning_dna = %s::jsonb, last_active = current_date
            """,
            (user_id, _json.dumps(learning_dna), _json.dumps(learning_dna)),
        )


def healthcheck() -> bool:
    try:
        conn = _get_conn()
        with conn.cursor() as cur:
            cur.execute("select 1")
            cur.fetchone()
        return True
    except Exception:  # noqa: BLE001
        reset_conn()
        return False


# ============ Phase 5: Grading & SM-2 Scheduling ============


def get_quiz_item(quiz_item_id: str) -> dict | None:
    """Fetch a single quiz item by its DB UUID. Returns dict with keys:
    id, concept_id, question, options, answer, qtype, difficulty — or None."""
    import json as _json

    conn = _get_conn()
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, concept_id, question, options, answer, qtype, difficulty "
            "FROM quiz_items WHERE id = %s",
            (quiz_item_id,),
        )
        row = cur.fetchone()
        if not row:
            return None
        return {
            "id": str(row[0]),
            "concept_id": str(row[1]),
            "question": row[2],
            "options": _json.loads(row[3]) if row[3] else None,
            "answer": row[4],
            "qtype": row[5],
            "difficulty": row[6],
        }


def get_mastery(concept_id: str) -> dict | None:
    """Fetch SM-2 mastery state for a concept. Returns dict with keys:
    concept_id, ease_factor, interval_days, repetitions, due_date, fail_count,
    last_strategy — or None."""
    conn = _get_conn()
    with conn.cursor() as cur:
        cur.execute(
            "SELECT concept_id, ease_factor, interval_days, repetitions, "
            "due_date, fail_count, last_strategy "
            "FROM mastery WHERE concept_id = %s",
            (concept_id,),
        )
        row = cur.fetchone()
        if not row:
            return None
        return {
            "concept_id": str(row[0]),
            "ease_factor": float(row[1]),
            "interval_days": float(row[2]),
            "repetitions": int(row[3]),
            "due_date": str(row[4]),
            "fail_count": int(row[5]),
            "last_strategy": row[6],
        }


def insert_attempt(
    user_id: str,
    quiz_item_id: str,
    correct: bool,
    partial: bool,
    response_text: str,
    misconception: str | None = None,
) -> str:
    """Insert a grading attempt into the attempts table. Returns attempt UUID."""
    import uuid as _uuid

    user_id = normalize_user_id(user_id)
    conn = _get_conn()
    with conn.cursor() as cur:
        _ensure_user_exists(cur, user_id)
        aid = str(_uuid.uuid4())
        cur.execute(
            """
            INSERT INTO attempts (id, user_id, quiz_item_id, correct, partial,
                                  response_text, misconception)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (aid, user_id, quiz_item_id, correct, partial,
             response_text[:5000], misconception),
        )
    return aid


def update_mastery(
    concept_id: str,
    ease_factor: float,
    interval_days: float,
    repetitions: int,
    due_date: str,
    fail_count: int,
    last_strategy: str | None = None,
) -> None:
    """Upsert SM-2 mastery state for a concept."""
    conn = _get_conn()
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO mastery (concept_id, ease_factor, interval_days,
                                 repetitions, due_date, fail_count, last_strategy)
            VALUES (%s, %s, %s, %s, %s::date, %s, %s)
            ON CONFLICT (concept_id) DO UPDATE SET
                ease_factor = EXCLUDED.ease_factor,
                interval_days = EXCLUDED.interval_days,
                repetitions = EXCLUDED.repetitions,
                due_date = EXCLUDED.due_date,
                fail_count = EXCLUDED.fail_count,
                last_strategy = EXCLUDED.last_strategy
            """,
            (concept_id, ease_factor, interval_days, repetitions,
             due_date, fail_count, last_strategy),
        )


# ============ Phase 6: Remediation Coach ============


def get_strategy_history(concept_id: str) -> list[dict]:
    """Get strategy history for a concept from the attempts table.
    Returns list of {strategy, worked} dicts from attempts that had strategy_shown."""
    conn = _get_conn()
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT a.strategy_shown, a.correct
            FROM attempts a
            JOIN quiz_items qi ON qi.id = a.quiz_item_id
            WHERE qi.concept_id = %s AND a.strategy_shown IS NOT NULL
            ORDER BY a.created_at ASC
            """,
            (concept_id,),
        )
        rows = cur.fetchall()
        return [
            {"strategy": row[0], "worked": bool(row[1])}
            for row in rows
        ]


def get_concept_name(concept_id: str) -> str | None:
    """Fetch the concept name by its DB UUID."""
    conn = _get_conn()
    with conn.cursor() as cur:
        cur.execute("SELECT name FROM concepts WHERE id = %s", (concept_id,))
        row = cur.fetchone()
        return row[0] if row else None


def get_source_excerpt_for_concept(concept_id: str) -> str:
    """Get the raw_text of the material that contains this concept.
    Used as grounding source for remediation re-teaching."""
    conn = _get_conn()
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT m.raw_text
            FROM materials m
            JOIN concepts c ON c.material_id = m.id
            WHERE c.id = %s
            LIMIT 1
            """,
            (concept_id,),
        )
        row = cur.fetchone()
        return row[0][:6000] if row and row[0] else ""


def update_learning_dna_best_strategy(user_id: str, strategy: str) -> None:
    """Write back the winning remediation strategy into learningDNA.inferredTraits.bestStrategy."""
    import json as _json

    user_id = normalize_user_id(user_id)
    conn = _get_conn()
    with conn.cursor() as cur:
        _ensure_user_exists(cur, user_id)
        # Fetch current learning_dna
        cur.execute("SELECT learning_dna FROM profiles WHERE user_id = %s", (user_id,))
        row = cur.fetchone()
        if not row:
            return
        dna = row[0] if isinstance(row[0], dict) else _json.loads(row[0]) if row[0] else {}
        traits = dna.get("inferredTraits", {})
        traits["bestStrategy"] = strategy
        dna["inferredTraits"] = traits
        cur.execute(
            "UPDATE profiles SET learning_dna = %s::jsonb WHERE user_id = %s",
            (_json.dumps(dna), user_id),
        )


def record_strategy_attempt(
    user_id: str,
    quiz_item_id: str,
    strategy: str,
    correct: bool,
    response_text: str,
) -> str:
    """Insert an attempt with strategy_shown for remediation tracking."""
    import uuid as _uuid

    user_id = normalize_user_id(user_id)
    conn = _get_conn()
    with conn.cursor() as cur:
        _ensure_user_exists(cur, user_id)
        aid = str(_uuid.uuid4())
        cur.execute(
            """
            INSERT INTO attempts (id, user_id, quiz_item_id, correct, partial,
                                  response_text, strategy_shown)
            VALUES (%s, %s, %s, %s, false, %s, %s)
            """,
            (aid, user_id, quiz_item_id, correct, response_text[:5000], strategy),
        )
    return aid


# ============ Phase 7: Mind Map + Progress ============


def _is_valid_uuid(val: Any) -> bool:
    import uuid as _uuid
    try:
        _uuid.UUID(str(val))
        return True
    except Exception:
        return False


def get_material_concepts_with_mastery(material_id: str) -> list[dict]:
    """Fetch all concepts for a material joined with their mastery data.
    Returns list of dicts with concept info + nested mastery object.
    Used by GET /materials/{id}/mastery-map for mind map coloring."""
    if not _is_valid_uuid(material_id):
        return []
    conn = _get_conn()
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT c.id, c.name, c.parent_id, c.difficulty, c.description,
                   COALESCE(m.ease_factor, 2.5),
                   COALESCE(m.interval_days, 0),
                   COALESCE(m.repetitions, 0),
                   m.due_date,
                   COALESCE(m.fail_count, 0),
                   m.last_strategy
            FROM concepts c
            LEFT JOIN mastery m ON m.concept_id = c.id
            WHERE c.material_id = %s
            ORDER BY c.name
            """,
            (material_id,),
        )
        rows = cur.fetchall()
        return [
            {
                "id": str(row[0]),
                "name": row[1],
                "parentId": str(row[2]) if row[2] else None,
                "difficulty": row[3],
                "description": row[4] or "",
                "mastery": {
                    "easeFactor": float(row[5]),
                    "intervalDays": float(row[6]),
                    "repetitions": int(row[7]),
                    "dueDate": str(row[8]) if row[8] else None,
                    "failCount": int(row[9]),
                    "lastStrategy": row[10],
                },
            }
            for row in rows
        ]


def get_material_strategy_stats(material_id: str) -> list[dict]:
    """Aggregate strategy attempt statistics for all concepts in a material.
    Returns list of {strategy, total, successes, rate}.
    Used by GET /materials/{id}/progress for strategy effectiveness chart."""
    if not _is_valid_uuid(material_id):
        return []
    conn = _get_conn()
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT a.strategy_shown,
                   COUNT(*)                              AS total,
                   COUNT(*) FILTER (WHERE a.correct)     AS successes
            FROM attempts a
            JOIN quiz_items qi ON qi.id = a.quiz_item_id
            JOIN concepts  c  ON c.id  = qi.concept_id
            WHERE c.material_id = %s
              AND a.strategy_shown IS NOT NULL
            GROUP BY a.strategy_shown
            ORDER BY total DESC
            """,
            (material_id,),
        )
        rows = cur.fetchall()
        return [
            {
                "strategy": row[0],
                "total": int(row[1]),
                "successes": int(row[2]),
                "rate": round(int(row[2]) / max(1, int(row[1])), 2),
            }
            for row in rows
        ]


def get_weakest_concepts(material_id: str, limit: int = 10) -> list[dict]:
    """Get the weakest concepts for a material, sorted by fail_count DESC then
    ease_factor ASC. Only returns concepts with fail_count > 0 or EF < 2.0.
    Used by GET /materials/{id}/progress for the 'needs attention' list."""
    if not _is_valid_uuid(material_id):
        return []
    conn = _get_conn()
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT c.id, c.name, m.fail_count, m.ease_factor,
                   m.due_date, m.repetitions
            FROM concepts c
            JOIN mastery m ON m.concept_id = c.id
            WHERE c.material_id = %s
              AND (m.fail_count > 0 OR m.ease_factor < 2.0)
            ORDER BY m.fail_count DESC, m.ease_factor ASC
            LIMIT %s
            """,
            (material_id, limit),
        )
        rows = cur.fetchall()
        return [
            {
                "conceptId": str(row[0]),
                "name": row[1],
                "failCount": int(row[2]),
                "easeFactor": float(row[3]),
                "dueDate": str(row[4]) if row[4] else None,
                "repetitions": int(row[5]),
            }
            for row in rows
        ]


def get_material_attempt_stats(material_id: str) -> dict:
    """Get overall attempt statistics for a material.
    Returns {totalAttempts, totalCorrect, totalPartial, totalWrong}.
    Used by GET /materials/{id}/progress for the overall stats card."""
    if not _is_valid_uuid(material_id):
        return {
            "totalAttempts": 0,
            "totalCorrect": 0,
            "totalPartial": 0,
            "totalWrong": 0,
        }
    conn = _get_conn()
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT COUNT(*)                                              AS total,
                   COUNT(*) FILTER (WHERE a.correct AND NOT a.partial)   AS correct,
                   COUNT(*) FILTER (WHERE a.partial)                     AS partial_ct,
                   COUNT(*) FILTER (WHERE NOT a.correct AND NOT a.partial) AS wrong
            FROM attempts a
            JOIN quiz_items qi ON qi.id = a.quiz_item_id
            JOIN concepts  c  ON c.id  = qi.concept_id
            WHERE c.material_id = %s
            """,
            (material_id,),
        )
        row = cur.fetchone()
        if not row:
            return {
                "totalAttempts": 0,
                "totalCorrect": 0,
                "totalPartial": 0,
                "totalWrong": 0,
            }
        return {
            "totalAttempts": int(row[0]),
            "totalCorrect": int(row[1]),
            "totalPartial": int(row[2]),
            "totalWrong": int(row[3]),
        }


# ============ Phase 8: Chat Tutor RAG ============


def insert_chunks(material_id: str, chunks: list[dict[str, Any]]) -> int:
    """Insert document chunks with embeddings into documents_chunks table.
    Each chunk dict must have: content, embedding (list[float]), metadata (dict).
    Returns the number of chunks inserted.
    """
    import json as _json
    import uuid as _uuid

    if not chunks:
        return 0

    conn = _get_conn()
    inserted_count = 0
    with conn.cursor() as cur:
        # Delete old chunks for this material if re-indexing
        cur.execute(
            "DELETE FROM documents_chunks WHERE material_id = %s",
            (material_id,),
        )
        for chunk in chunks:
            chunk_id = str(_uuid.uuid4())
            content = chunk.get("content", "").strip()
            if not content:
                continue

            metadata = chunk.get("metadata", {})
            embedding = chunk.get("embedding")
            if embedding and len(embedding) == 768:
                vec_str = "[" + ",".join(str(float(x)) for x in embedding) + "]"
                cur.execute(
                    """
                    INSERT INTO documents_chunks (id, material_id, content, embedding, metadata)
                    VALUES (%s, %s, %s, %s::vector, %s::jsonb)
                    """,
                    (chunk_id, material_id, content, vec_str, _json.dumps(metadata)),
                )
            else:
                cur.execute(
                    """
                    INSERT INTO documents_chunks (id, material_id, content, metadata)
                    VALUES (%s, %s, %s, %s::jsonb)
                    """,
                    (chunk_id, material_id, content, _json.dumps(metadata)),
                )
            inserted_count += 1

    return inserted_count


def search_chunks(
    material_id: str,
    query_embedding: list[float],
    top_k: int = 6,
) -> list[dict[str, Any]]:
    """Cosine similarity search on documents_chunks scoped to a material.
    Returns list of {id, content, metadata, similarity} dicts.
    """
    import json as _json

    if not query_embedding or len(query_embedding) != 768:
        return get_material_chunks_fallback(material_id, top_k)

    conn = _get_conn()
    vec_str = "[" + ",".join(str(float(x)) for x in query_embedding) + "]"

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, content, metadata,
                   1 - (embedding <=> %s::vector) AS similarity
            FROM documents_chunks
            WHERE material_id = %s AND embedding IS NOT NULL
            ORDER BY embedding <=> %s::vector ASC
            LIMIT %s
            """,
            (vec_str, material_id, vec_str, top_k),
        )
        rows = cur.fetchall()
        if not rows:
            return get_material_chunks_fallback(material_id, top_k)

        results = []
        for r in rows:
            meta = r[2] if isinstance(r[2], dict) else _json.loads(r[2]) if r[2] else {}
            results.append({
                "id": str(r[0]),
                "content": r[1],
                "metadata": meta,
                "similarity": float(r[3]) if r[3] is not None else 0.0,
            })
        return results


def get_material_chunks_fallback(material_id: str, limit: int = 6) -> list[dict[str, Any]]:
    """Fallback retrieval: returns raw chunks from documents_chunks or material raw_text."""
    import json as _json

    conn = _get_conn()
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, content, metadata
            FROM documents_chunks
            WHERE material_id = %s
            ORDER BY (metadata->>'chunk_index')::int ASC NULLS LAST
            LIMIT %s
            """,
            (material_id, limit),
        )
        rows = cur.fetchall()
        if rows:
            return [
                {
                    "id": str(r[0]),
                    "content": r[1],
                    "metadata": r[2] if isinstance(r[2], dict) else _json.loads(r[2]) if r[2] else {},
                    "similarity": 0.5,
                }
                for r in rows
            ]

        # If no chunks exist in documents_chunks, fetch material raw_text
        cur.execute("SELECT id, title, raw_text FROM materials WHERE id = %s", (material_id,))
        mat_row = cur.fetchone()
        if mat_row and mat_row[2]:
            return [{
                "id": str(mat_row[0]),
                "content": mat_row[2][:3000],
                "metadata": {"section_ref": mat_row[1] or "Overview", "chunk_index": 0},
                "similarity": 0.5,
            }]

    return []


def get_material_for_session(session_id: str) -> str | None:
    """Resolve material_id for a given session by checking agent_runs or recent materials."""
    import json as _json
    import uuid as _uuid

    conn = _get_conn()
    with conn.cursor() as cur:
        # Check if session_id is a valid UUID
        is_valid_uuid = False
        try:
            _uuid.UUID(str(session_id))
            is_valid_uuid = True
        except (ValueError, TypeError):
            is_valid_uuid = False

        if is_valid_uuid:
            try:
                # Check agent_runs for matching session_id
                cur.execute(
                    """
                    SELECT graph_state FROM agent_runs
                    WHERE session_id = %s::uuid AND graph_state->>'materialId' IS NOT NULL
                    ORDER BY created_at DESC LIMIT 1
                    """,
                    (session_id,),
                )
                row = cur.fetchone()
                if row and row[0]:
                    state = row[0] if isinstance(row[0], dict) else _json.loads(row[0])
                    mat_id = state.get("materialId")
                    if mat_id:
                        return str(mat_id)
            except Exception:
                pass

        # Fallback: get the most recent material
        cur.execute(
            "SELECT id FROM materials ORDER BY created_at DESC LIMIT 1"
        )
        row = cur.fetchone()
        if row:
            return str(row[0])

    return None



