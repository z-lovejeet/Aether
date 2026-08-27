"""Text Chunker with Markdown Section Tracking (docs/05j-chat-tutor.md §Pipeline).

Splits cleaned study materials into overlapping semantic chunks with section
references for RAG retrieval and citation grounding.
"""

from __future__ import annotations

import re
from typing import Any


def chunk_text(
    text: str,
    chunk_size: int = 600,
    overlap: int = 80,
    min_chunk_len: int = 30,
) -> list[dict[str, Any]]:
    """Split clean markdown text into overlapping chunks with section metadata.
    
    Returns a list of dicts with:
    - "content": str (chunk text)
    - "metadata": dict with chunk_index, section_ref, char_start, char_end
    """
    if not text or not text.strip():
        return []

    # First pass: identify section headings and paragraphs
    paragraphs = re.split(r"\n\s*\n", text.strip())
    
    current_section = "Overview"
    blocks: list[tuple[str, str, int, int]] = []  # (content, section_ref, start, end)
    
    cursor = 0
    for p in paragraphs:
        p_clean = p.strip()
        if not p_clean:
            continue
        
        # Check if paragraph starts with a heading
        heading_match = re.match(r"^(#{1,6})\s+(.+)$", p_clean, re.MULTILINE)
        if heading_match:
            current_section = heading_match.group(2).strip()
            # Clean heading markup if it has trailing hashes or bold
            current_section = re.sub(r"[*_`]", "", current_section)
        
        start_idx = text.find(p_clean, cursor)
        if start_idx == -1:
            start_idx = cursor
        end_idx = start_idx + len(p_clean)
        cursor = end_idx
        
        blocks.append((p_clean, current_section, start_idx, end_idx))

    if not blocks:
        return []

    chunks: list[dict[str, Any]] = []
    current_chunk_parts: list[str] = []
    current_chunk_len = 0
    current_chunk_section = blocks[0][1]
    current_start = blocks[0][2]
    current_end = blocks[0][3]

    for p_clean, section, start_pos, end_pos in blocks:
        # If adding this paragraph exceeds chunk size and we already have content
        if current_chunk_len + len(p_clean) > chunk_size and current_chunk_parts:
            chunk_str = "\n\n".join(current_chunk_parts).strip()
            if len(chunk_str) >= min_chunk_len:
                chunks.append({
                    "content": chunk_str,
                    "metadata": {
                        "chunk_index": len(chunks),
                        "section_ref": current_chunk_section,
                        "char_start": current_start,
                        "char_end": current_end,
                    },
                })
            
            # Prepare overlap from the tail of previous chunk
            if overlap > 0 and len(chunk_str) > overlap:
                overlap_text = chunk_str[-overlap:].strip()
                # Try to break at sentence or word
                space_idx = overlap_text.find(" ")
                if space_idx != -1:
                    overlap_text = overlap_text[space_idx + 1 :]
                current_chunk_parts = [overlap_text, p_clean] if overlap_text else [p_clean]
                current_chunk_len = sum(len(x) for x in current_chunk_parts)
            else:
                current_chunk_parts = [p_clean]
                current_chunk_len = len(p_clean)
            
            current_chunk_section = section
            current_start = start_pos
            current_end = end_pos
        else:
            current_chunk_parts.append(p_clean)
            current_chunk_len += len(p_clean)
            current_chunk_section = section
            current_end = end_pos

    # Flush remaining chunk
    if current_chunk_parts:
        chunk_str = "\n\n".join(current_chunk_parts).strip()
        if len(chunk_str) >= min_chunk_len:
            chunks.append({
                "content": chunk_str,
                "metadata": {
                    "chunk_index": len(chunks),
                    "section_ref": current_chunk_section,
                    "char_start": current_start,
                    "char_end": current_end,
                },
            })

    # If text was short and resulted in 0 chunks, add the whole text as single chunk
    if not chunks and len(text.strip()) > 0:
        chunks.append({
            "content": text.strip(),
            "metadata": {
                "chunk_index": 0,
                "section_ref": "Overview",
                "char_start": 0,
                "char_end": len(text.strip()),
            },
        })

    return chunks
