# 01 · Product Requirements Document (PRD)
## Mastery Engine — *"Remember Everything."*

---

## 1. Vision
An AI study system that learns how **you** learn. Drop in any material — a textbook photo, PDF, lecture recording, or YouTube link — and receive a complete personalized study system: explainer, quiz, flashcards, audio lesson, mind map, and cheat sheet, all tuned to your Learning DNA. A spaced-repetition engine then fights the 140-year-old **forgetting curve**, re-teaching weak concepts *differently* until they stick.

## 2. Problem Statement
- Ebbinghaus (1885): ~70% of newly learned information is forgotten within 24 hours; ~90% within a week.
- Students compensate by re-reading and highlighting — methods learning science ranks as among the least effective.
- What works (active recall + spaced repetition) has never been made effortless for a normal student.
- Generic AI tools generate content once; none track per-concept memory over time or adapt teaching strategy to the individual.

**One-line pitch:** "Every student studies hard. Mastery Engine makes sure hard work finally pays off — so no student ever says *'I knew it yesterday.'*"

## 3. Target Users
| Segment | Primary use case | Value |
|---|---|---|
| Middle schoolers (11–14) | Photograph homework chapter; simple, fun explanations | Feels like a game |
| High schoolers (15–18) | Exam-prep systems from class notes; scheduled review | Beats cramming |
| College students | 40-page PDFs & lectures → condensed mastery systems | Time compression |
| Teachers | Lesson upload → differentiated worksheet + exit quiz + answer key | Hours of prep saved |
| Self-learners / professionals | Courses, docs, certification prep | Structured retention |

## 4. Features (MoSCoW)

### Must Have (P0) — hackathon scope
1. Multi-format ingestion: photo (OCR), PDF/text paste, audio, YouTube link
2. Behavioral onboarding wizard ("Learning DNA") + profile storage
3. AI concept extraction → hierarchical concept tree per material
4. Personalized explainer (style/interests/level/language aware)
5. Adaptive quiz generator (MCQ + short answer) with instant grading
6. Auto-generated flashcards (with interest-based hints)
7. Spaced-repetition scheduler (SM-2) + daily Review Queue
8. Remediation loop: fail concept 2× → re-teach with new strategy → log outcome
9. Interactive mind map with mastery color-coding
10. Dashboard: subjects, streaks, review forecast, weakest concepts
11. Auth + multi-subject organization

### Should Have (P1)
12. Audio lessons (TTS with karaoke highlighting)
13. Chat Tutor (RAG over user's materials)
14. Progress analytics (memory decay curves, strategy effectiveness)
15. Cheat sheet (printable one-pager)

### Could Have (P2) — stretch
16. Teacher Mode (differentiated worksheets at 3 reading levels + exit quiz + answer key)
17. XP/streak gamification polish, confetti milestones
18. Shareable study-set links

## 5. Success Metrics (hackathon demo criteria)
- Upload-to-study-system latency ≤ 60 s for a textbook page
- Grading feedback latency ≤ 2 s (Groq path)
- At least one full remediation loop demonstrable live
- Lighthouse accessibility ≥ 90; all text-on-glass contrast ≥ 4.5:1

## 6. Out of Scope (v1)
- Native mobile apps (responsive web only), offline mode, payments, collaboration/multiplayer, curriculum standards mapping.
