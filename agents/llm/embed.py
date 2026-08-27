"""Gemini Embedding wrapper (docs/05j-chat-tutor.md §Pipeline).

Generates 768-dimensional embeddings via Gemini API for document chunking
and vector similarity search in pgvector.
"""

from __future__ import annotations

import asyncio
from typing import Sequence

from google.genai import types as gtypes
from .gemini import _get_client

EMBEDDING_MODEL = "gemini-embedding-001"
OUTPUT_DIMENSIONALITY = 768
MAX_BATCH_SIZE = 50


async def embed_texts(texts: Sequence[str]) -> list[list[float]]:
    """Embed a list of text strings into 768-dim float vectors.
    
    Batches texts up to MAX_BATCH_SIZE per API call, retrying on failure.
    """
    if not texts:
        return []

    client = _get_client()
    config = gtypes.EmbedContentConfig(
        output_dimensionality=OUTPUT_DIMENSIONALITY,
    )

    all_embeddings: list[list[float]] = []

    for i in range(0, len(texts), MAX_BATCH_SIZE):
        batch = [t if t.strip() else " " for t in texts[i : i + MAX_BATCH_SIZE]]
        last_err: Exception | None = None

        for attempt in range(3):
            try:
                res = await client.aio.models.embed_content(
                    model=EMBEDDING_MODEL,
                    contents=batch,
                    config=config,
                )
                if not res.embeddings:
                    raise ValueError("No embeddings returned by Gemini API")
                
                for emb in res.embeddings:
                    all_embeddings.append(list(emb.values))
                break
            except Exception as err:  # noqa: BLE001
                last_err = err
                print(f"[embed] Batch {i//MAX_BATCH_SIZE + 1} attempt {attempt + 1} failed: {err}")
                await asyncio.sleep(1.0 * (attempt + 1))
        else:
            raise RuntimeError(f"Embedding batch failed after 3 attempts: {last_err}")

    return all_embeddings


async def embed_query(query: str) -> list[float]:
    """Embed a single query string for vector similarity search."""
    cleaned = query.strip() or " "
    res = await embed_texts([cleaned])
    if not res:
        raise RuntimeError("Failed to generate embedding for query")
    return res[0]
