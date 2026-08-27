"use client";

import confetti from "canvas-confetti";

export interface ConfettiOptions {
  particleCount?: number;
  spread?: number;
  origin?: { x: number; y: number };
  colors?: string[];
}

export function fireConfetti(options: ConfettiOptions = {}) {
  if (typeof window === "undefined") return;

  // Respect reduced motion
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return;

  const count = options.particleCount ?? 60;
  const spread = options.spread ?? 70;
  const origin = options.origin ?? { y: 0.7 };
  const colors = options.colors ?? ["#8B5CF6", "#34D399", "#FBBF24", "#38BDF8", "#F472B6"];

  confetti({
    particleCount: count,
    spread: spread,
    origin: origin,
    colors: colors,
    disableForReducedMotion: true,
  });
}

export function fireMilestoneConfetti() {
  if (typeof window === "undefined") return;
  const end = Date.now() + 1.2 * 1000;
  const colors = ["#8B5CF6", "#34D399", "#FBBF24", "#60A5FA"];

  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: colors,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}

export default function ConfettiBurst() {
  return null;
}
