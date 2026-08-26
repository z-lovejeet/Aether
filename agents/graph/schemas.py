"""Concept-tree schemas + validation (docs/05b-concept-architect.md).

Validation rules enforced here:
  - 3-15 top-level topics
  - max depth 3
  - unique ids, no orphan parentIds, no cycles
  - >= 2 leaves, each leaf independently quizable (has keyFacts)
"""

from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator


class ConceptNode(BaseModel):
    id: str = Field(min_length=1)
    name: str = Field(min_length=2, max_length=120)
    parentId: Optional[str] = None
    difficulty: int = Field(ge=1, le=5, default=3)
    terms: list[str] = Field(default_factory=list)
    keyFacts: list[str] = Field(default_factory=list)

    @field_validator("id", "parentId")
    @classmethod
    def _strip(cls, v: str | None) -> str | None:
        return v.strip() if isinstance(v, str) else v


class ConceptTree(BaseModel):
    nodes: list[ConceptNode]

    # ---- structural helpers ----

    def depth(self) -> int:
        by_id = {n.id: n for n in self.nodes}
        memo: dict[str, int] = {}

        def d(nid: str, seen: set[str]) -> int:
            if nid in seen or nid not in by_id:
                return 0
            if nid in memo:
                return memo[nid]
            seen = seen | {nid}
            parent = by_id[nid].parentId
            r = 1 + (d(parent, seen) if parent else 0)
            memo[nid] = r
            return r

        return max((d(n.id, set()) for n in self.nodes), default=0)

    def roots(self) -> list[ConceptNode]:
        ids = {n.id for n in self.nodes}
        return [n for n in self.nodes if not n.parentId or n.parentId not in ids]

    def leaves(self) -> list[ConceptNode]:
        child_ids = {n.parentId for n in self.nodes if n.parentId}
        return [n for n in self.nodes if n.id not in child_ids]

    def children_of(self, pid: str) -> list[ConceptNode]:
        return [n for n in self.nodes if n.parentId == pid]


def validate_tree(raw: Any) -> tuple[ConceptTree | None, list[str]]:
    """Parse + validate a raw LLM JSON payload. Returns (tree|None, errors)."""
    errors: list[str] = []

    # accept either a bare list of nodes or {"nodes": [...]} / {"tree": [...]}
    if isinstance(raw, dict):
        raw_nodes = raw.get("nodes") or raw.get("tree") or raw.get("concepts")
    else:
        raw_nodes = raw
    if not isinstance(raw_nodes, list) or not raw_nodes:
        return None, ["payload is not a non-empty list of concept nodes"]

    try:
        tree = ConceptTree(nodes=[ConceptNode(**n) for n in raw_nodes])
    except Exception as err:  # pydantic ValidationError and friends
        return None, [f"schema violation: {err}"]

    ids = [n.id for n in tree.nodes]
    if len(ids) != len(set(ids)):
        errors.append("duplicate node ids")
    idset = set(ids)
    for n in tree.nodes:
        if n.parentId and n.parentId not in idset:
            errors.append(f"orphan parentId '{n.parentId}' on node '{n.id}'")

    # cycle check via depth computation guard
    if tree.depth() == 0 and tree.nodes:
        errors.append("cycle detected in parent chain")

    if not (3 <= len(tree.roots()) <= 15):
        errors.append(f"expected 3-15 top-level topics, got {len(tree.roots())}")
    if tree.depth() > 3:
        errors.append(f"max depth is 3, got {tree.depth()}")
    if len(tree.leaves()) < 2:
        errors.append(f"need >= 2 leaves, got {len(tree.leaves())}")

    return (tree, []) if not errors else (None, errors)


def flatten_tree(raw: Any) -> ConceptTree:
    """Graceful degrade (docs/05b §Validation Loop): keep node content,
    drop all parenting -> single-level tree."""
    nodes = raw if isinstance(raw, list) else (raw or {}).get("nodes") or []
    flat: list[ConceptNode] = []
    for n in nodes:
        try:
            node = ConceptNode(**n)
            node.parentId = None
            flat.append(node)
        except Exception:  # skip unrecoverable entries  # noqa: BLE001
            continue
    return ConceptTree(nodes=flat)


def tree_to_dicts(tree: ConceptTree) -> list[dict[str, Any]]:
    """Serialize to plain dicts matching GraphState.conceptTree."""
    return [n.model_dump() for n in tree.nodes]
