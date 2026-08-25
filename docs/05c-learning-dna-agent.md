# 05c · 🧬 Learning DNA Agent

## Mission
Own the learner's profile: run behavioral onboarding once, then keep inferring and updating *how this person learns best* from every interaction. This is where "the system learns how you learn" lives.

## Triggers
- New user → guided onboarding interview
- After each session / remediation outcome → trait inference update
- `profile_update` intent (settings edits)

## Inputs
Onboarding answers · `attempts` history · `strategyHistory` · session metadata (time-of-day, pace, modality usage)

## Outputs
Updated `profiles.learning_dna` (LearningProfile JSON, see 04 §1) including `inferredTraits.bestStrategy`, confidence notes, and a human-readable profile summary shown in Settings.

## LLM Choice
Groq for inference summarization (fast); deterministic merge code does the actual JSON patching (LLM proposes, code validates).

## Prompt Strategy
Onboarding (conversational, not a boring form): 8 questions from PRD — goal, subject level, explanation style preference, pick-3 interests, session length, cadence, modality, language comfort. One question per screen with playful glass UI.
Trait inference System: "Given attempt history and which teaching strategies produced passes/fails, infer updated learning traits. Only claim a trait when evidence ≥ 3 data points. Propose JSON patch."

## Inference Rules (examples)
- Passes cluster on analogy-based re-teaches → `bestStrategy='analogy'`
- Repeated short vague free-text answers → suggest 'steps' style
- Evening-only activity + cram cadence → shorter quizzes, tighter review intervals near exam dates

## Graph Position
Hub node — called by orchestrator at onboarding/session-end; consulted by ALL generation agents via state read (never blocking the hot path).

## Error Handling
Conflicting signals → keep prior trait + lower confidence; never silently overwrite explicit user choices (user-set beats inferred).

## Success Criteria
- Onboarding completion time ≤ 2 min; skip-anytime
- Profile demonstrably changes generated output tone (A/B snapshot test)
- Strategy inference converges within ≤ 5 remediation events in simulation

## Cost Notes
Cheapest agent — mostly bookkeeping + small inference calls.
