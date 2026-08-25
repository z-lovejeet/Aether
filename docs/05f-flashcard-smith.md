# 05f · 🃏 Flashcard Smith Agent

## Mission
Auto-generate two-sided flashcards with **interest-personalized hints** — atomic knowledge units that feed the spaced-repetition loop alongside quizzes.

## Triggers
- `concepts_ready` (parallel fan-out member #3)

## Inputs
`conceptTree` (leaf nodes primarily) · `learningDNA.interests`, `.explanationStyle` · `cleanedText`

## Outputs
`generatedAssets.flashcards[]` `{front, back, hint, conceptId, sm2:{}}`
Card types mix: definition · term→meaning · process-order ("what comes next?") · contrast pairs (mitosis vs meiosis) · diagram-describe (visual learners).

## LLM Choice
Groq JSON mode — bulk generation in one call per topic chunk.

## Prompt Strategy
System: "Create flashcards from the source only. One fact per card, front = cue/question (≤15 words), back = complete answer (≤40 words). HINT must leverage one of the learner's interests ({interests}) as a memory bridge WITHOUT giving the answer away. Match card type to learner style={explanationStyle}."
Quality bars: no yes/no fronts; no card requires context from another card; contrast cards explicitly name the distinguishing feature.

## Graph Position
In: fan-out join. Out: persisted to `flashcards` with fresh SM-2 state; review sessions later update both `flashcards.sm2` and parent `mastery`.

## Error Handling
Duplicates (cosine > 0.92 on embeddings vs existing cards) → dropped automatically; too few cards generated → targeted re-prompt listing missing leaf concepts.

## Success Criteria
- ≥1 card per leaf concept on sample docs
- Hint quality: answers-not-leaked on manual audit of 20 hints
- Generation ≤ 6 s per textbook page

## Cost Notes
Cheapest generator; runs fully inside the parallel window so it adds zero wall-clock time.
