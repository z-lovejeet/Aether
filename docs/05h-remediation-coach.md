# 05h · 🩺 Remediation Coach Agent ⭐
### *The creative-AI crown jewel of Mastery Engine*

## Mission
When a concept fails twice, stop quizzing and **re-teach it a different way**. Walk a strategy ladder until the concept clicks, then write back WHICH strategy worked into the learner's Learning DNA. This closed feedback loop is what makes the system learn how you learn.

## Triggers
- Conditional edge from Grader: `verdict=wrong && fail_count>=2`.

## Inputs
`currentAttempt.gradeResult.misconception` · `strategyHistory[conceptId]` (never repeat a failed strategy for this concept) · `learningDNA` (start ladder at preferred style) · source excerpt for the concept · `mastery.last_strategy`

## Outputs
`remediationPlan[]` steps rendered as a focused mini-lesson chat · updated `mastery` after post-check · patched `learningDNA.inferredTraits.bestStrategy` + confidence on success · `strategyHistory` append

## The Strategy Ladder (ordered)
```
analogy → visual description → step-by-step breakdown
       → simpler level (−1 grade band) → story form → different interest domain
Start position = learningDNA.explanationStyle preference.
```

## Conversation Protocol (per step)
1. **Diagnose out loud** — restate the detected misconception empathetically ("I see the trap — you said X causes Y, but watch…")
2. **Re-teach** with the CURRENT strategy, ≤120 words, grounded in source
3. **Micro-check** — ONE fresh question testing the same concept from a new angle
4. Pass → celebrate + log strategy as `worked:true` → hand to Scheduler (bonus interval boost)
5. Fail → advance ladder, repeat (max 5 steps) → then park concept, schedule near-term retry, notify user kindly

## LLM Choice
Groq for speed (each step must feel conversational, ≤2 s); Gemini fallback. Misconception-aware diagnosis prompt includes the Grader's evidence quote.

## Prompt Strategy (core system prompt)
"You are Coach. The learner failed '{concept}' twice; detected misconception: {type} — '{evidence}'. Teach it using STRATEGY={s}. Rules: never reuse strategies already tried for this concept [{tried}]; ground every claim in the excerpt; use their interests {interests}; tone = warm, zero condescension; end by asking your micro-check question."

## Why This Wins Creative AI (25 pts)
Generic tutors loop the same explanation louder. Ours runs a **structured exploration over a teaching-strategy space with memory**, converging on a per-brain teaching policy — a genuine personalization algorithm, not a persona wrapper. Demo shot: mind-map node flips red→amber→green as the ladder climbs.

## Graph Position
In: conditional edge from `grader`. Out: `scheduler_agent` (on success or parking) + `learning_dna_agent` patch event.

## Error Handling
LLM loop-guard: hard cap 5 ladder steps; all strategies exhausted → schedule 24 h retry + suggest alternative resource types (video/teacher ask).

## Success Criteria
- Simulated learner study: ≥70% concepts rescued within 3 ladder steps
- bestStrategy inference stable across two consecutive sessions in 8/10 simulated profiles
- Each conversational step ≤2 s

## Cost Notes
Low frequency, high value — allow slightly larger prompts here than other agents.
