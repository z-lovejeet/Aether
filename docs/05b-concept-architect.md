# 05b · 🏛️ Concept Architect Agent

## Mission
Transform cleaned material into a hierarchical **concept tree** — the skeleton every other agent builds upon.

## Triggers
- `material_parsed`.

## Inputs
`cleanedText` · `learningDNA.goal`, `.levelBySubject[subject]` (depth calibration)

## Outputs
`conceptTree: ConceptNode[]` — validated JSON:
```json
{"id":"c1","name":"Photosynthesis","parentId":null,"difficulty":2,
 "children":["c2","c3"],
 "terms":["chlorophyll"],"keyFacts":["occurs in chloroplasts"]}
```
Rules: 3–15 top-level topics; max depth 3; every leaf must be independently quizable ("explainable in 1–3 sentences").

## LLM Choice
Groq Llama 3.x JSON mode (structured output is its strength). Fallback: Gemini Flash.

## Prompt Strategy
System: "You are a curriculum architect. Decompose study material into a concept tree. Each node: id, name, parentId, difficulty 1–5, terms[], keyFacts[]. Leaves must be independently testable. Calibrate granularity to level={level}, goal={goal}. Output strict JSON matching schema."
Few-shot: one worked example (photosynthesis excerpt → tree).

## Validation Loop
Pydantic/schema check → orphan ids, cycles, >max depth → self-correction reprompt (1×) → if still invalid, flatten to single-level tree (graceful degrade).

## Graph Position
In: ingestion_agent. Out: fan-out to `content_forge ∥ quiz_master ∥ flashcard_smith`; also persists concepts to Supabase and seeds `mastery` rows (via Scheduler tool).

## Error Handling
Empty/degenerate tree (<2 leaves) → re-prompt with "be more granular"; still failing → surface "material too thin" UI guidance.

## Success Criteria
- Teacher-judged coverage ≥90% of teachable points on 3 sample documents
- Schema-valid output rate ≥95% without reprompt
- ≤ 8 s for a textbook page

## Cost Notes
Cache by `hash(cleanedText)+level+goal`.
