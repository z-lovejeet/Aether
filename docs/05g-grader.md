# 05g · ⚖️ Grader Agent

## Mission
Evaluate every answer — especially free text — and return a structured verdict **plus the detected misconception**. Its output drives the pipeline's most important conditional edge.

## Triggers
- Quiz/flashcard answer submitted (`quiz_submitted`)
- Remediation micro-check answers (during Coach conversations)

## Inputs
`currentAttempt {conceptId, response}` · `quizItems` entry + rubric · `cleanedText` excerpt (grounding truth) · `strategyHistory` (context)

## Outputs
`gradeResult {verdict: correct|partial|wrong, score, misconception?: {type, evidenceQuote}, feedbackMd}` · attempt persisted to `attempts`
Misconception taxonomy: `overgeneralization | reversed_causality | wrong_priority | terminology_confusion | partial_recall | invented_fact`

## LLM Choice
Groq (target ≤1.5 s) for MCQ/short; Gemini fallback for nuanced essay-style grading. MCQs graded deterministically in code first — LLM only handles short/explain.

## Prompt Strategy
System: "You are an exam grader. Compare the learner's answer to the model answer + rubric, grounded ONLY in the source excerpt. Verdicts: correct / partial / wrong. For wrong or partially-wrong, identify the single best-fit misconception type from the taxonomy and QUOTE the exact phrase that reveals it. Feedback ≤2 sentences, encouraging tone, never reveals the full answer (a retry may follow). Output strict JSON."

## Graph Position
Hub node. Out-edges: pass/partial → `scheduler_agent`; wrong && fail_count≥2 → `remediation_coach` (conditional); wrong but fresh → back to quiz flow with hint.

## Error Handling
Ambiguous/off-topic answer → verdict `wrong`, misconception `invented_fact`, gentle nudge; LLM timeout → mark attempt "pending", never block the user mid-session.

## Success Criteria
- Agreement with human grader ≥90% on 50-answer benchmark set
- Misconception-type accuracy ≥80% on planted-error test suite
- p95 latency ≤1.5 s

## Cost Notes
Deterministic-first design keeps LLM calls limited to open-ended items.
