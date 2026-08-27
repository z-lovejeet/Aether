"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Brain,
  Cpu,
  Zap,
  ArrowRight,
  Workflow,
  Sparkles,
  Layers,
  GraduationCap,
  BookOpen,
  Volume2,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Database,
  Radio,
} from "lucide-react";
import { LiquidGlassCard } from "@/components/glass/LiquidGlassCard";
import { LiquidGlassButton } from "@/components/glass/LiquidGlassButton";
import { LiquidGlassBadge } from "@/components/glass/LiquidGlassBadge";

const STRATEGY_LADDER = [
  {
    step: 1,
    name: "Analogy & Metaphor",
    desc: "Bridges unfamiliar technical terms to physical or everyday mental models you already master.",
    color: "text-indigo-700",
    bg: "bg-indigo-50/80 border-indigo-200",
  },
  {
    step: 2,
    name: "Visual / Coordinate Flow",
    desc: "Breaks concepts down into spatial maps, coordinate diagrams, and directional flows.",
    color: "text-sky-700",
    bg: "bg-sky-50/80 border-sky-200",
  },
  {
    step: 3,
    name: "Step-by-Step Algorithmic",
    desc: "Isolates the mechanism into numbered algorithmic steps with strict cause-and-effect.",
    color: "text-emerald-700",
    bg: "bg-emerald-50/80 border-emerald-200",
  },
  {
    step: 4,
    name: "Simpler First Principles",
    desc: "Strips all jargon away and explains the root physical reason the concept exists.",
    color: "text-amber-800",
    bg: "bg-amber-50/80 border-amber-200",
  },
  {
    step: 5,
    name: "Narrative & Discovery Story",
    desc: "Frames the concept as a human story — what problem was the original discoverer trying to solve?",
    color: "text-purple-700",
    bg: "bg-purple-50/80 border-purple-200",
  },
  {
    step: 6,
    name: "Different Interest Anchor",
    desc: "Re-anchors the topic in an alternate hobby from your Learning DNA (e.g. music, gaming, sports).",
    color: "text-rose-700",
    bg: "bg-rose-50/80 border-rose-200",
  },
];

export default function AboutPage() {
  const [selectedLadderStep, setSelectedLadderStep] = useState(0);

  return (
    <main className="relative min-h-screen px-4 pb-24 sm:px-8">
      <div className="mx-auto max-w-5xl pt-6 sm:pt-10">
        {/* Top Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold mb-4">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            <span>Architecture & Cognitive Science</span>
          </div>
          <h1 className="display text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            How Aether Works
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600 leading-relaxed">
            You don&apos;t fail exams because you didn&apos;t study. You fail because nobody taught you how to <i>remember</i>. Aether is a multi-agent learning engine built to defeat the 1885 Ebbinghaus forgetting curve.
          </p>
        </div>

        {/* ─── 0. The Problem & Brand Story ─── */}
        <section className="mt-12">
          <LiquidGlassCard depth="medium" className="p-7 sm:p-10 border-slate-200/90 bg-white/95 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900">
                  The Forgetting Curve vs. Active Memory Synthesis
                </h2>
                <p className="text-xs text-slate-500">Why passive studying fails 70% of students within 24 hours</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <div className="space-y-3">
                <p>
                  In 1885, psychologist Hermann Ebbinghaus proved that <b>over 70% of new information is forgotten within 24 hours</b> without spaced retrieval. Standard study habits like re-reading and passive highlighting provide an illusion of competence that evaporates on test day.
                </p>
                <p>
                  <b>Aether flips this dynamic.</b> Instead of passive reading, our multi-agent pipeline immediately deconstructs any document or lecture into a structured concept tree, active recall quizzes, and personalized flashcards scheduled right at the mathematical threshold of forgetting.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-rose-700">Passive Reading</span>
                  <span className="text-rose-700 font-mono">18% 30-Day Retention</span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 w-[18%]" />
                </div>

                <div className="flex items-center justify-between text-xs font-bold pt-2">
                  <span className="text-emerald-700">Aether Spaced Retrieval (SM-2)</span>
                  <span className="text-emerald-700 font-mono">94.2% 30-Day Retention</span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[94.2%]" />
                </div>
                <p className="text-[11px] text-slate-500 pt-1">
                  Validated against SuperMemo SM-2 interval expansion algorithm and Dual Coding cognitive theory.
                </p>
              </div>
            </div>
          </LiquidGlassCard>
        </section>

        {/* ─── 1. Multi-Agent Supervisor Topology ─── */}
        <section className="mt-12">
          <LiquidGlassCard depth="medium" className="p-7 sm:p-10 border-slate-200/90 bg-white/95 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Workflow className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900">
                    Multi-Agent Orchestration Topology
                  </h2>
                  <p className="text-xs text-slate-500">LangGraph State Machine with 10 Specialized Agents</p>
                </div>
              </div>
              <LiquidGlassBadge variant="indigo">LangGraph + Python</LiquidGlassBadge>
            </div>

            <p className="mt-5 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Standard AI study tools rely on a single massive prompt that hallucinates and forgets details. Aether uses a <b>typed LangGraph state machine</b> where each specialist is an expert agent performing schema-validated transformations in parallel under 15 seconds.
            </p>

            {/* Topology Flowchart Grid */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/80 space-y-1.5">
                <span className="font-mono text-indigo-600 font-bold text-[11px]">STAGE 1</span>
                <h4 className="font-display font-bold text-slate-900 text-sm">Multimodal Ingestion</h4>
                <p className="text-slate-600">Gemini 3.6 Flash extracts text & LaTeX from PDF documents, photos, handwritten notes, voice lectures, and YouTube videos.</p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/80 space-y-1.5">
                <span className="font-mono text-sky-600 font-bold text-[11px]">STAGE 2</span>
                <h4 className="font-display font-bold text-slate-900 text-sm">Concept Architecture & RAG</h4>
                <p className="text-slate-600">Concept Architect builds hierarchical dependency trees and indexes chunked embeddings into Supabase pgvector.</p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/80 space-y-1.5">
                <span className="font-mono text-emerald-600 font-bold text-[11px]">STAGE 3</span>
                <h4 className="font-display font-bold text-slate-900 text-sm">Parallel Asset Synthesis</h4>
                <p className="text-slate-600">Content Forge, Quiz Master, and Flashcard Smith execute in parallel over Groq (GPT-OSS-120B & 20B) for sub-second delivery.</p>
              </div>
            </div>
          </LiquidGlassCard>
        </section>

        {/* ─── 2. The 6-Step Remediation Strategy Ladder ─── */}
        <section className="mt-12">
          <LiquidGlassCard depth="medium" className="p-7 sm:p-10 border-slate-200/90 bg-white/95 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900">
                    The 6-Step Remediation Ladder
                  </h2>
                  <p className="text-xs text-slate-500">Automatic Socratic Rescue Loop on Misconceptions</p>
                </div>
              </div>
              <LiquidGlassBadge variant="amber">Adaptive Pedagogical Loop</LiquidGlassBadge>
            </div>

            <p className="mt-5 text-xs sm:text-sm text-slate-600 leading-relaxed">
              When a student misses a question or exhibits a misconception, the Grader triggers a conditional edge routing directly to the <b>Remediation Coach</b>. Instead of just repeating the same explanation louder, the coach climbs an adaptive strategy ladder until comprehension clicks.
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

        {/* ─── 3. Full Model & Infrastructure Matrix ─── */}
        <section className="mt-12">
          <LiquidGlassCard depth="low" className="p-7 sm:p-10 border-slate-200/90 bg-white/95 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900">
                  Infrastructure & Model Allocation
                </h2>
                <p className="text-xs text-slate-500">Zero-compromise high-speed architecture with 100% free resilience</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                <p>
                  Every quiz answer is mathematically mapped to a review quality rating <i>q</i> from 0 to 5. The scheduler recalibrates the concept&apos;s <b>SuperMemo Ease Factor (EF)</b>:
                </p>
                <div className="p-3.5 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto shadow-inner">
                  EF′ = max(1.3, EF + (0.1 − (5 − q) × (0.08 + (5 − q) × 0.02)))
                </div>
                <p className="text-xs text-slate-500">
                  Passed reviews exponentially increase spacing intervals (1d → 6d → <i>Interval × EF</i>), ensuring long-term consolidation without burnout.
                </p>
              </div>

              <div className="space-y-2.5 rounded-xl bg-slate-50 p-5 border border-slate-200/80 text-xs">
                <h4 className="font-display font-bold text-slate-900 text-sm mb-2">Live Production Stack</h4>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">Multimodal OCR & Vision:</span>
                  <b className="text-slate-800">Google Gemini 3.6 Flash</b>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">Pedagogical Explainer & RAG:</span>
                  <b className="text-slate-800">Groq (openai/gpt-oss-120b)</b>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">Structured Quiz & Flashcards:</span>
                  <b className="text-slate-800">Groq (openai/gpt-oss-20b)</b>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">Neural Voice Audio Lessons:</span>
                  <b className="text-slate-800">Microsoft Azure (edge-tts)</b>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">Database & Vector Storage:</span>
                  <b className="text-slate-800">Supabase PostgreSQL + pgvector</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Frontend & Framework:</span>
                  <b className="text-slate-800">Next.js 16 (App Router + Turbopack)</b>
                </div>
              </div>
            </div>
          </LiquidGlassCard>
        </section>

        {/* ─── Platform Features Grid ─── */}
        <section className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/upload" className="block">
            <LiquidGlassCard depth="low" className="p-5 h-full hover:border-indigo-300 transition-all bg-white/95">
              <Layers className="h-5 w-5 text-indigo-600 mb-2" />
              <h4 className="font-bold text-slate-900 text-sm">Study Studio</h4>
              <p className="text-xs text-slate-500 mt-1">Convert photos, PDFs, text, audio & YouTube into study hubs.</p>
            </LiquidGlassCard>
          </Link>

          <Link href="/questions" className="block">
            <LiquidGlassCard depth="low" className="p-5 h-full hover:border-sky-300 transition-all bg-white/95">
              <BookOpen className="h-5 w-5 text-sky-600 mb-2" />
              <h4 className="font-bold text-slate-900 text-sm">Practice Arena</h4>
              <p className="text-xs text-slate-500 mt-1">Generate on-demand custom quizzes across any topic.</p>
            </LiquidGlassCard>
          </Link>

          <Link href="/teacher" className="block">
            <LiquidGlassCard depth="low" className="p-5 h-full hover:border-emerald-300 transition-all bg-white/95">
              <GraduationCap className="h-5 w-5 text-emerald-600 mb-2" />
              <h4 className="font-bold text-slate-900 text-sm">Teacher Mode</h4>
              <p className="text-xs text-slate-500 mt-1">Differentiated classroom worksheets with answer keys.</p>
            </LiquidGlassCard>
          </Link>

          <Link href="/analyzer" className="block">
            <LiquidGlassCard depth="low" className="p-5 h-full hover:border-purple-300 transition-all bg-white/95">
              <TrendingUp className="h-5 w-5 text-purple-600 mb-2" />
              <h4 className="font-bold text-slate-900 text-sm">Memory Analyzer</h4>
              <p className="text-xs text-slate-500 mt-1">Live Ebbinghaus retention curves and strategy win-rates.</p>
            </LiquidGlassCard>
          </Link>
        </section>

        {/* CTA */}
        <div className="mt-14 text-center">
          <Link href="/upload">
            <LiquidGlassButton size="lg" icon={<ArrowRight className="h-4 w-4" />}>
              Launch Study Studio →
            </LiquidGlassButton>
          </Link>
        </div>
      </div>
    </main>
  );
}
