# 06 · UI/UX Design System — "Liquid Glass OS"
## Mastery Engine

Apple-grade liquid glass, fully custom components (no kit defaults). Five pillars:

---

## 1. Lighting & Material Model
All surfaces are simulated physical glass under one global light source (top-left):

- **Refraction:** `backdrop-filter: blur(24px) saturate(180%)` over the aurora background
- **Specular rim:** 1px top-edge highlight via gradient mask (`rgba(255,255,255,.6) → transparent`)
- **Sheen + shadow:** soft radial white glow top-left inside each panel; diffuse shadow bottom-right — consistent direction everywhere
- **Liquid morph:** panels stretch/flow between states (Framer Motion `layoutId` shared-element transitions; subject tile morphs into study-page header)
- **Depth tiers (strict):** aurora bg z0 → glass panels z1 → frosted modals z2 (heavier blur) → floating controls z3 (brightest rim). Max 3 glass layers visible at once.

### Glass recipes (CSS tokens)
```css
--glass-fill:      rgba(255,255,255,.06);
--glass-fill-modal:rgba(255,255,255,.10);
--glass-rim-top:   rgba(255,255,255,.25);
--glass-blur:      24px;   /* modal: 40px */
.glass { background: var(--glass-fill); backdrop-filter: blur(var(--glass-blur)) saturate(180%);
         border-radius: 24px;
         border-top: 1px solid var(--glass-rim-top);
         box-shadow: 0 8px 32px rgba(0,0,0,.35); }
```

## 2. Color Theme — "Aurora over Deep Space" (dark-first)
| Token | Dark | Light | Use |
|---|---|---|---|
| base | `#0A0A14` | `#F4F4FB` | app background |
| aurora mesh | violet `#7C3AED` → teal `#2DD4BF` → amber `#F59E0B` drifting blurred blobs + 4% SVG grain overlay (kills banding) | same @ 60% opacity | behind all glass |
| primary accent | `#8B5CF6` electric violet | — | CTAs, active |
| success/mastery | `#34D399` emerald | | green mind-map nodes |
| learning | `#FBBF24` amber | | in-progress |
| forget/alert | `#FB7185` coral | | fading nodes, errors |

**Subject hue inheritance:** each subject owns a hue (Biology=emerald, Physics=violet…); entering a subject re-tints its glass glow, mind map, and accents.

## 3. Typography
Display: **Clash Display / Space Grotesk** (tight tracking headers). Body/UI: **Inter**, line-height 1.6.
Scale: 12 / 14 / 16 / 20 / 28 / 40 / 64 px.

## 4. Bento Grid System
- Dashboard: asymmetric bento — "Today's Review" hero tile (2×2), streak flame, mastery radar mini-tile, quick-upload orb, exam countdown strip. 16px gutters, 24px radius.
- Landing: feature-wall bento, each capability tile contains a looping micro-demo.

## 5. Motion & Micro-interactions (Framer Motion springs)
| Component | Interaction |
|---|---|
| Cards | cursor tilt ±4°, rim brightens, lift shadow |
| Buttons | spring squash (.96) on press; particle micro-burst on success |
| Mind-map nodes | ripple-ring bloom when mastery crosses green ⭐ payoff shot |
| Flashcards | physics flip + specular sweep; swipe fling |
| Quiz feedback | correct → emerald wash + confetti; wrong → gentle shake + coral pulse → "Coach is on it" |
| Upload/processing | aurora swirl accelerates; live agent pipeline indicator lights up sequentially per node |
| Rings/bars | draw-on overshoot spring |
| Transitions | shared-element morphs only, never hard cuts |
| Streak flame | noise-driven flicker, grows daily |

## 6. Component Inventory (custom, ~25)
Glass primitives: `GlassCard GlassPanel GlassModal GlassNav FloatingDock AuroraBackground NoiseOverlay SkeletonGlass`
App: `BentoTile MasteryRing MindMapNode MindMapEdge Flashcard QuizOption ConfettiBurst StreakFlame AgentPipelineIndicator UploadOrb SubjectHueProvider ReviewQueueCard XPBar`

## 7. Accessibility & Performance Guardrails
- Text-on-glass contrast ≥ 4.5:1 (solid-ish patches where blur heavy)
- `prefers-reduced-motion`: disable tilt/confetti/parallax, keep opacity fades
- GPU-safe: transform/opacity only; cap simultaneous blurred layers ≤ 12
- All celebratory animations ≤ 400 ms except milestones
