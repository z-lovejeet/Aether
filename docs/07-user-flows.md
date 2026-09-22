# 07 · User Flows & Wireframes
## Mastery Engine

---

## Flow 1 — First-run Magic (landing → first system)
```
Landing (/) ──CTA──▶ Sign up (Supabase magic link / Google)
  └─▶ /onboarding wizard: 8 Learning DNA questions, one per glass screen,
      progress dots, skip-anytime, playful icons
  └─▶ /upload: four tabs [📷 Photo | 📄 PDF/Text | 🎙️ Audio | ▶ YouTube]
      + subject picker (create subject w/ aurora hue) + level picker
  └─▶ /processing: full-screen aurora swirl; AgentPipelineIndicator lights up:
      🔍 Ingestion → 🏛️ Concepts → ✍️🎯🃏 (three lanes in parallel) → 📅 Scheduled
      latency counter visible ("concepts extracted · 4.2s")
  └─▶ auto-navigate to /study/[id] Overview tab — "Your system is ready"
```

## Flow 2 — Study Session
```
/study/[id] tabs:
  Overview   personalized explainer; 🔊 listen; per-section "quiz this"
  Mind Map   interactive graph, nodes colored by mastery; click node → popover
             [explain again | quiz | why is this weak?]
  Quiz       adaptive runner: MCQ → instant verdict animation;
             short answer → Grader feedback ≤2s;
             fail×2 → Remediation Coach takes over inline (chat panel,
             strategy ladder visibly climbing: analogy→visual→…)
  Flashcards 3D-flip cards, swipe know/still-learning, interest hints
  Cheat Sheet printable one-pager
```

## Flow 3 — Daily Review Loop
```
/dashboard: bento grid — Today's Review hero tile (count + est. minutes),
streak flame, mastery radar, forecast strip
  └─▶ /review: focused queue session (mix of due concepts + flashcards),
      same grading/remediation machinery, XP ticks up per item
  └─▶ completion: confetti milestone + "memory forecast" updated live
```

## Flow 4 — Ask Anything
```
/chat: glass chat thread; answers stream token-by-token; source chips
under claims; suggested action chips ("Quiz me on this")
```

## Flow 5 — Teacher Mode (stretch)
```
/teacher: upload lesson → choose output set (worksheets ×3 levels,
exit quiz, answer key) → preview glass documents → approve & export PDF
```

## Key Screens (wireframe notes)
| Screen | Layout notes |
|---|---|
| Landing | dark space bg + aurora blobs; H1 "Remember everything."; phone-photo demo GIF; feature-wall bento below; footer w/ documentation links |
| Onboarding | centered single question, huge type, 8 progress dots, interest picker as emoji chips |
| Dashboard | bento: hero review tile 2×2 top-left; hue-tinted per active subject |
| Processing | AgentPipelineIndicator = horizontal lane of glowing glass nodes with connecting liquid lines |
| Mind map | React Flow canvas on deep-space bg; edges thin light strokes; mastery ripple bloom |
| Progress | memory decay curves + strategy-effectiveness bars + weakest-concepts list |
| Settings | edit DNA (same wizard, pre-filled); language; subjects & hues |

Empty states everywhere use brand copy: *"Your first system is sixty seconds away."*
