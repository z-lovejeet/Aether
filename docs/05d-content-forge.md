# 05d · ✍️ Content Forge Agent

## Mission
Generate the **personalized explainer** and **cheat sheet** — every paragraph filtered through the learner's Learning DNA.

## Triggers
- `concepts_ready` (parallel fan-out member #1)

## Inputs
`conceptTree` · `cleanedText` (grounding source) · full `learningDNA`

## Outputs
`generatedAssets.explainerMd` (per-concept sections, reading-level matched) · `generatedAssets.cheatSheetMd` (one-page condensed)

## LLM Choice
Groq Llama 3.x for speed; long materials (>30k tokens) chunked per top-level topic, then stitched. Gemini fallback.

## Prompt Strategy
System template (the personalization core):
"You are writing for THIS learner: goal={goal}, level={level}, style={explanationStyle}, interests={interests}, language={language} (keep technical terms in English), session length={sessionLengthMin} min.
Rules: ground EVERY fact in the source material — never invent. Prefer analogies drawn from the learner's interests. One concept per section, section = hook → explanation → micro-example → 1-line takeaway. Reading level matched to {level}."
Per-section user payload: source excerpt + concept subtree.

**Personalization demo pair:** same concept generated twice with two different DNA profiles → side-by-side shot for video/landing (cricket vs cooking analogy).

## Grounding Guardrail
Post-generation spot-check (cheap Groq call or regex heuristics): flag any sentence containing facts absent from source excerpts → mark section "verify" rather than silently shipping hallucination.

## Graph Position
In: fan-out join. Out: assets persisted (`materials.generated_assets`), progress event to UI.

## Error Handling
Chunk failure → retry that chunk only; total failure → explainer falls back to cleanedText with heading structure (still useful).

## Success Criteria
- Blind preference test: personalized vs generic version preferred by target-profile students ≥ 80%
- Explainer for a textbook page ≤ 12 s
- Hallucination flags < 2% of sentences

## Cost Notes
Largest token consumer — mitigate via per-topic caching and cheat-sheet reuse of explainer embeddings.
