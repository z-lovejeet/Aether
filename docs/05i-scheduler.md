# 05i · 📅 Scheduler Agent

## Mission
The **deterministic core** of Mastery Engine: run the SM-2 spaced-repetition algorithm over every concept and flashcard, and build the daily Review Queue. No LLM — pure, testable algorithm. This is deliberate: it proves the system is built on learning science, not just prompt vibes.

## Triggers
- `grade = pass` (from Grader) → update that concept's SM-2 state
- `review_due` → build today's queue
- Post-remediation rescue → update with bonus interval confidence
- Flashcard swipe outcomes (`know` / `still-learning`) → per-card SM-2 state

## Inputs
`mastery` rows (ease_factor, interval_days, repetitions, due_date) · `attempts` verdicts · `learningDNA.cadence` + subject `exam_date` · `flashcards.sm2`

## Outputs
Updated `mastery` + `flashcards` rows · today's `ReviewQueue` (ordered list: overdue → due-today → weak-concept boosts) · forecast data for dashboard ("memory weather" strip)

## Algorithm
Full SM-2 spec with worked example in `04-data-model.md §3`. Mapping: wrong→q=1, partial→q=3, correct→q=4/5.

## Scheduling Modifiers (deterministic rules)
- **Exam proximity:** within 7 days of `subjects.exam_date` → compress intervals ×0.6, prioritize exam-subject concepts
- **Cadence fit:** `cram` users get shorter intervals but more daily items; `daily` users standard
- **Rescue bonus:** concept passed via Remediation gets q=4 (not 5) — solid but watch it
- **Interleaving:** queue mixes subjects & question types (blocked review is weaker)

## LLM Choice
None. Pure TypeScript/Python functions — 100% unit-test coverage required. (LLMs are used nowhere in this agent by design.)

## Graph Position
Terminal node for pass-paths; entry point for `review_due`. Writes directly to Supabase via typed tools; emits dashboard stats events to UI.

## Error Handling
Corrupt/missing mastery row → re-seed defaults from Concept Architect output; clock anomalies (due_date in future past) → clamp.

## Test Suite (must-pass before Phase 5 done)
1. New concept pass sequence 1d→6d→~14d matches worked example exactly
2. Failure resets repetitions & interval, decrements EF correctly, floors at 1.3
3. Exam-compression modifier applied only inside window
4. Queue ordering: overdue > due > boost; interleaved across subjects

## Success Criteria
- Zero algorithmic drift vs reference implementation on 200-case fuzz suite
- Queue build ≤100 ms for 500 concepts
- Dashboard "next review" predictions visibly accurate across a 7-day simulation

## Cost Notes
Zero API cost — this agent is free forever. Mention that in the demo; judges appreciate engineering honesty.
