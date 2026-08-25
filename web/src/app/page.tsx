import Link from "next/link";
import { AuroraBackground } from "@/components/glass/AuroraBackground";
import { GlassCard } from "@/components/glass/GlassCard";

export default function LandingPage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <AuroraBackground />

      {/* brand mark */}
      <p className="mb-6 text-sm font-medium uppercase tracking-[0.35em] text-[var(--text-secondary)]">
        Mastery Engine
      </p>

      <GlassCard className="max-w-2xl px-10 py-14 sm:px-16" interactive>
        <h1 className="display text-5xl font-bold leading-tight sm:text-6xl">
          Remember{" "}
          <span className="bg-gradient-to-r from-[var(--aurora-1)] via-[var(--aurora-2)] to-[var(--aurora-3)] bg-clip-text text-transparent">
            everything.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-[var(--text-secondary)]">
          Turn any textbook page, lecture, or messy note into a study system
          that learns how you learn — and never lets you forget.
        </p>
        <Link
          href="/onboarding"
          className="mt-10 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-8 py-3.5 font-display text-sm font-semibold shadow-lg shadow-purple-500/30 transition-transform duration-300 hover:scale-[1.04] active:scale-[0.97]"
        >
          Photograph your first chapter →
        </Link>
      </GlassCard>

      <p className="mt-8 text-xs text-[var(--text-secondary)]">
        Your first system is sixty seconds away.
      </p>
    </main>
  );
}
