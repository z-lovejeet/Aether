# 05e · 🎯 Quiz Master Agent

## Mission
Generate **adaptive active-recall quizzes** that adjust difficulty live based on running accuracy — retrieval practice, not trivia.

## Triggers
- `concepts_ready` (fan-out member #2) → initial quiz bank
- `next_question` → on-the-fly question when bank is exhausted or difficulty shift needed

## Inputs
`conceptTree` + `cleanedText` · `learningDNA` · running `attempts` stats for this session · `mastery` levels

## Outputs
`generatedAssets.quizItems[]` `{id, conceptId, qtype: mcq|short|explain, question, options?, answer, difficulty}` · live `currentAttempt` staging

## LLM Choice
Groq JSON mode; ≤1.5 s per on-the-fly question.

## Prompt Strategy
System: "You write retrieval-practice questions grounded ONLY in the source. Mix: 40% recall, 30% application, 20% explain-in-your-words, 10% connect-two-concepts. Difficulty {1-5} calibrated to mastery={m} and rolling accuracy={acc}. Distractors must be plausible misconceptions, not jokes. For 'explain' items include a model answer + rubric bullets."
Adaptation rule (code, not prompt): acc > 80% over last 4 → difficulty +1; < 40% → −1 and route struggling concepts toward Remediation.

## Question Quality Rules
- Never ask what the material doesn't state
- One concept per question
- "Explain in your own words" items are mandatory for core concepts — they feed the Grader's misconception detection

## Graph Position
In: fan-out join / orchestrator (`next_question`). Out: quiz bank persisted; hands grading to `grader` via attempt submission flow.

## Error Handling
Malformed options → regenerate single item; empty bank at session start → synthesize from cheat sheet takeaways.

## Success Criteria
- ≥95% schema-valid without retry
- Teacher-rated "fair & answerable from material" ≥90% on 30-question audit
- On-the-fly latency ≤1.5 s p95

## Cost Notes
Bank generation amortized once per material; adaptation itself is deterministic code.
