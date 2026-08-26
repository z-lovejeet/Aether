"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Brain,
  Cpu,
  Zap,
  ArrowRight,
  Workflow,
} from "lucide-react";
import { LiquidGlassCard } from "@/components/glass/LiquidGlassCard";
import { LiquidGlassButton } from "@/components/glass/LiquidGlassButton";
import { LiquidGlassBadge } from "@/components/glass/LiquidGlassBadge";

const STRATEGY_LADDER = [
  {
    step: 1,
    name: "Analogy",
    desc: "Bridges unfamiliar technical terms to physical or everyday mental models you already master.",
    color: "text-indigo-700",
    bg: "bg-indigo-50/70 border-indigo-200",
  },
  {
    step: 2,
    name: "Visual / Spatial",
    desc: "Breaks concepts down into spatial maps, coordinate diagrams, and directional flows.",
    color: "text-sky-700",
    bg: "bg-sky-50/70 border-sky-200",
  },
  {
    step: 3,
    name: "Step-by-Step",
    desc: "Isolates the mechanism into numbered algorithmic steps with strict cause-and-effect.",
    color: "text-emerald-700",
    bg: "bg-emerald-50/70 border-emerald-200",
  },
  {
    step: 4,
    name: "Simpler First Principles",
    desc: "Strips all jargon away and explains the root physical reason the concept exists.",
    color: "text-amber-800",
    bg: "bg-amber-50/70 border-amber-200",
  },
  {
    step: 5,
    name: "Narrative & Historical Context",
    desc: "Frames the concept as a human story — what problem was the original discoverer trying to solve?",
    color: "text-purple-700",
    bg: "bg-purple-50/70 border-purple-200",
  },
  {
    step: 6,
    name: "Different Interest Hook",
    desc: "Re-anchors the topic in an alternate hobby from your Learning DNA (e.g. music, gaming, sports).",
    color: "text-rose-700",
    bg: "bg-rose-50/70 border-rose-200",
  },
];

export default function AboutPage() {
  const [selectedLadderStep, setSelectedLadderStep] = useState(0);

  return (
    <main className="relative min-h-screen px-4 pb-24 sm:px-8">
      <div className="mx-auto max-w-4xl pt-6 sm:pt-10">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold mb-4">
            <span>Architecture & Cognitive Science</span>
          </div>
          <h1 className="display text-4xl sm:text-5xl font-extrabold text-slate-900">
            How Aether Works
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-slate-600 leading-relaxed">
            Built from first principles for deep conceptual retention. Learn about our multi-agent architecture, the SM-2 spaced repetition engine, and our 6-step rescue ladder.
          </p>
        </div>

        {/* ─── 1. Supervisor Topology Architecture ─── */}
        <section className="mt-14">
          <LiquidGlassCard depth="medium" className="p-7 sm:p-10 border-slate-200/90 bg-white/95">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Workflow className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900">
                    Multi-Agent Supervisor Architecture
                  </h2>
                  <p className="text-xs text-slate-500">Structured State Graph with 8 Specialist Nodes</p>
                </div>
              </div>
              <LiquidGlassBadge variant="indigo">LangGraph + FastAPI</LiquidGlassBadge>
            </div>

            <p className="mt-5 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Standard AI study tools rely on a single massive prompt that hallucinates and forgets details. Aether uses a <b>typed LangGraph state machine</b> where each specialist is an expert agent performing schema-validated transformations.
            </p>

            {/* Topology Flowchart Grid */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/80 space-y-1.5">
                <span className="font-mono text-indigo-600 font-bold text-[11px]">STAGE 1</span>
                <h4 className="font-display font-bold text-slate-900 text-sm">Multimodal Ingestion</h4>
                <p className="text-slate-600">Gemini 3.7 Flash extracts raw text from PDF documents, photos, audio lectures, and YouTube videos.</p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/80 space-y-1.5">
                <span className="font-mono text-sky-600 font-bold text-[11px]">STAGE 2</span>
                <h4 className="font-display font-bold text-slate-900 text-sm">Concept Knowledge Tree</h4>
                <p className="text-slate-600">Concept Architect builds hierarchical dependency trees with calibrated difficulty ratings (1–5).</p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/80 space-y-1.5">
                <span className="font-mono text-emerald-600 font-bold text-[11px]">STAGE 3</span>
                <h4 className="font-display font-bold text-slate-900 text-sm">Parallel Asset Synthesis</h4>
                <p className="text-slate-600">Content Forge, Quiz Master, and Flashcard Smith execute in parallel over Groq Llama 3 for fast generation.</p>
              </div>
            </div>
          </LiquidGlassCard>
        </section>

        {/* ─── 2. The 6-Step Remediation Strategy Ladder ─── */}
        <section className="mt-12">
          <LiquidGlassCard depth="medium" className="p-7 sm:p-10 border-slate-200/90 bg-white/95">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900">
                    The 6-Step Remediation Ladder
                  </h2>
                  <p className="text-xs text-slate-500">Automatic Rescue Loop on Consecutive Failures</p>
                </div>
              </div>
              <LiquidGlassBadge variant="amber">Adaptive Pedagogical Loop</LiquidGlassBadge>
            </div>

            <p className="mt-5 text-xs sm:text-sm text-slate-600 leading-relaxed">
              When a student fails a concept twice, the Grader triggers a conditional edge routing directly to the <b>Remediation Coach</b>. Instead of just repeating the wrong answer, the coach climbs a pedagogical ladder until understanding is unlocked.
            </p>

            {/* Interactive Ladder Steps */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {STRATEGY_LADDER.map((step, idx) => (
                <div
                  key={step.name}
                  onClick={() => setSelectedLadderStep(idx)}
                  className={`cursor-pointer rounded-xl p-4 border transition-all duration-150 ${step.bg} ${
                    selectedLadderStep === idx ? "ring-2 ring-slate-900 shadow-sm" : "hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-bold text-slate-400">STEP {step.step}</span>
                    <span className={`text-xs font-bold ${step.color}`}>{step.name}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600">{step.desc}</p>
                </div>
              ))}
            </div>
          </LiquidGlassCard>
        </section>

        {/* ─── 3. Cognitive Science & SM-2 Equation ─── */}
        <section className="mt-12">
          <LiquidGlassCard depth="low" className="p-7 sm:p-10 border-slate-200/90 bg-white/95">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900">
                  SuperMemo SM-2 Spaced Repetition
                </h2>
                <p className="text-xs text-slate-500">Mathematical Decay Modeling & Ease Factor Dynamics</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                <p>
                  Every quiz answer is mapped to a review quality rating <i>q</i> from 0 to 5. The system recalibrates the concept&apos;s <b>Ease Factor (EF)</b>:
                </p>
                <div className="p-3.5 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto">
                  EF′ = max(1.3, EF + (0.1 − (5 − q) × (0.08 + (5 − q) × 0.02)))
                </div>
                <p className="text-xs text-slate-500">
                  Passed reviews increase the interval: 1 day → 6 days → <i>Interval × EF</i>. Failed reviews reset repetitions and schedule immediate remediation.
                </p>
              </div>

              <div className="space-y-2.5 rounded-xl bg-slate-50 p-5 border border-slate-200/80 text-xs">
                <h4 className="font-display font-bold text-slate-900 text-sm mb-2">Model Assignment Matrix</h4>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">Multimodal OCR & Audio:</span>
                  <b className="text-slate-800">Gemini 3.7 Flash</b>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">Fast JSON Synthesis:</span>
                  <b className="text-slate-800">Groq Llama 3.x</b>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">MCQ Grading:</span>
                  <b className="text-slate-800">Deterministic Exact-Match</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Short Answer Misconceptions:</span>
                  <b className="text-slate-800">Groq → Gemini Fallback</b>
                </div>
              </div>
            </div>
          </LiquidGlassCard>
        </section>

        {/* CTA */}
        <div className="mt-14 text-center">
          <Link href="/upload">
            <LiquidGlassButton size="lg" icon={<ArrowRight className="h-4 w-4" />}>
              Try Study Studio Free
            </LiquidGlassButton>
          </Link>
        </div>
      </div>
    </main>
  );
}
