"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Brain,
  Layers,
  Target,
  FileText,
  Sparkles,
  TrendingUp,
  Volume2,
  Pause,
  Play,
  Check,
  Zap,
  RotateCw,
  Compass,
  ArrowUpRight,
  Cpu,
  Workflow,
  BookOpen,
} from "lucide-react";
import { LiquidGlassCard } from "@/components/glass/LiquidGlassCard";
import { LiquidGlassButton } from "@/components/glass/LiquidGlassButton";
import { LiquidGlassBadge } from "@/components/glass/LiquidGlassBadge";

const PRESETS = [
  {
    id: "bio",
    title: "Cellular Respiration & Glycolysis",
    subject: "Cellular Biology",
    docName: "Biology_Ch4_Cellular_Respiration.pdf",
    rawNote: "Glucose (6C) is split into 2 Pyruvate (3C) in cytoplasm. Consumes 2 ATP, generates 4 ATP and 2 NADH. Net gain = 2 ATP. Followed by Krebs Cycle in matrix and ETC on inner membrane.",
    concepts: [
      { name: "Glycolysis Net Yield", level: "2 ATP + 2 NADH", status: "mastered", ef: 2.7 },
      { name: "Energy Investment Phase", level: "2 ATP Consumed", status: "learning", ef: 2.4 },
      { name: "Electron Transport Chain", level: "Proton Gradient via ATP Synthase", status: "learning", ef: 2.3 },
    ],
    sampleQuestion: "What is the net ATP yield produced per glucose molecule during glycolysis?",
    options: [
      "A) 2 ATP molecules",
      "B) 4 ATP molecules",
      "C) 32 ATP molecules",
      "D) 0 ATP (Investment only)",
    ],
    correctAnswer: "A) 2 ATP molecules",
    explanation: "4 ATP are synthesized during payoff, but 2 ATP are invested initially, yielding a net gain of +2 ATP.",
    flashcardFront: "Where in the eukaryotic cell does the Krebs Cycle occur?",
    flashcardBack: "Inside the mitochondrial matrix (yielding NADH, FADH2, and 2 ATP per glucose).",
    memoryHook: "Inside the powerhouse room itself (the matrix fluid).",
  },
  {
    id: "cs",
    title: "Dijkstra's Shortest Path Algorithm",
    subject: "Computer Science",
    docName: "CS201_Graph_Algorithms.pdf",
    rawNote: "Greedy algorithm to find shortest paths with non-negative edge weights. Uses min-priority queue. Fails on negative weights because visited vertices are greedily marked final.",
    concepts: [
      { name: "Edge Relaxation", level: "dist[v] = min(dist[v], dist[u]+w)", status: "mastered", ef: 2.8 },
      { name: "Min-Priority Queue", level: "O((V + E) log V) with binary heap", status: "learning", ef: 2.5 },
      { name: "Negative Weight Invariant", level: "Greedy optimality breaks", status: "weak", ef: 2.1 },
    ],
    sampleQuestion: "Why does Dijkstra's algorithm fail when a graph has negative edge weights?",
    options: [
      "A) It gets stuck in infinite loops on DAGs",
      "B) Greedy finalization assumes distances can never decrease later",
      "C) Priority queues cannot store negative numbers",
      "D) It only operates on acyclic trees",
    ],
    correctAnswer: "B) Greedy finalization assumes distances can never decrease later",
    explanation: "Dijkstra finalizes nodes greedily upon extraction; a negative edge encountered later could create a shorter path to an already finalized node.",
    flashcardFront: "What is the time complexity of Dijkstra using a binary min-heap?",
    flashcardBack: "O((V + E) log V)",
    memoryHook: "Each vertex extracted once (V log V), each edge relaxed once (E log V).",
  },
  {
    id: "econ",
    title: "Opportunity Cost & PPF Curve",
    subject: "Microeconomics",
    docName: "Econ101_Production_Frontier.pdf",
    rawNote: "Opportunity cost is the next best alternative forgone. PPF curve shows trade-offs and productive efficiency. Bowed-out shape reflects the law of increasing opportunity costs.",
    concepts: [
      { name: "Opportunity Cost", level: "Marginal rate of transformation", status: "mastered", ef: 2.9 },
      { name: "PPF Concavity", level: "Law of increasing opportunity costs", status: "learning", ef: 2.4 },
      { name: "Productive Efficiency", level: "Operating on the frontier line", status: "mastered", ef: 2.8 },
    ],
    sampleQuestion: "What causes the Production Possibility Frontier (PPF) to be bowed outward (concave)?",
    options: [
      "A) Constant opportunity costs across sectors",
      "B) The law of increasing opportunity costs (specialized resources)",
      "C) Fluctuating currency inflation",
      "D) Inefficient resource distribution",
    ],
    correctAnswer: "B) The law of increasing opportunity costs (specialized resources)",
    explanation: "Resources are not equally adaptable; reallocating them yields increasing marginal sacrifice.",
    flashcardFront: "Define 'Productive Efficiency' in terms of the PPF frontier.",
    flashcardBack: "Producing at any point along the curve where you cannot produce more of one good without sacrificing another.",
    memoryHook: "Operating strictly on the outer curve boundary.",
  },
];

export default function LandingPage() {
  const [activePreset, setActivePreset] = useState(PRESETS[0]);
  const [activeMode, setActiveMode] = useState<"quiz" | "flashcard" | "tree">("quiz");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHook, setShowHook] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  function handlePresetChange(p: typeof PRESETS[0]) {
    setActivePreset(p);
    setSelectedOption(null);
    setIsFlipped(false);
    setShowHook(false);
    setIsPlayingAudio(false);
  }

  return (
    <main className="relative min-h-screen px-4 pb-28 sm:px-8">
      {/* ─── 1. Minimalist Editorial Hero ─── */}
      <section className="mx-auto max-w-4xl pt-8 sm:pt-14 text-center">
        {/* Subtle Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-slate-200/90 text-slate-600 text-xs font-medium shadow-sm mb-6"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse" />
          <span className="font-mono tracking-wider uppercase text-[11px] text-slate-700 font-semibold">Aether Study Engine</span>
        </motion.div>

        {/* Clean, Proportionate Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="display text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.12]"
        >
          Turn messy notes <br className="hidden sm:block" />
          <span className="text-slate-500 font-normal">into permanent understanding.</span>
        </motion.h1>

        {/* Crisp Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mx-auto mt-5 max-w-xl text-base sm:text-lg text-slate-600 leading-relaxed font-sans"
        >
          Drop in any lecture slides, PDF chapter, or voice recording. Aether builds an active concept tree, adaptive quizzes, and an automated rescue coach tailored to your Learning DNA.
        </motion.p>

        {/* Action Controls */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mt-7 flex flex-wrap items-center justify-center gap-3"
        >
          <Link href="/upload">
            <LiquidGlassButton size="lg" icon={<ArrowRight className="h-4 w-4" />}>
              Create Study Hub Free
            </LiquidGlassButton>
          </Link>
          <Link href="/about">
            <LiquidGlassButton variant="secondary" size="lg" className="!text-slate-900 border-slate-300 font-semibold shadow-sm">
              Explore Architecture
            </LiquidGlassButton>
          </Link>
        </motion.div>

        {/* Quick Launch Preset Chips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs"
        >
          <span className="text-slate-400 font-medium mr-1">Try sample material:</span>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => handlePresetChange(p)}
              className={`px-3 py-1 rounded-full transition-all duration-150 ${
                activePreset.id === p.id
                  ? "bg-slate-900 text-white font-semibold shadow-sm"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-sm"
              }`}
            >
              {p.subject}
            </button>
          ))}
        </motion.div>
      </section>

      {/* ─── 2. Floating Interactive Studio Canvas ─── */}
      <section className="mx-auto mt-10 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="rounded-3xl border border-slate-200/90 bg-white/95 shadow-2xl shadow-slate-900/5 overflow-hidden"
        >
          {/* macOS Titlebar & Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-[#ff5f56] border border-[#e0443e]/40" />
                <span className="h-3 w-3 rounded-full bg-[#ffbd2e] border border-[#dea123]/40" />
                <span className="h-3 w-3 rounded-full bg-[#27c93f] border border-[#1aab29]/40" />
              </div>
              <span className="font-mono text-xs text-slate-500 truncate max-w-[220px] sm:max-w-none">
                {activePreset.docName}
              </span>
            </div>

            {/* Mode Tabs */}
            <div className="flex items-center gap-1 bg-slate-200/60 p-0.5 rounded-full text-xs">
              {[
                { id: "quiz", label: "Active Quiz", icon: Target },
                { id: "flashcard", label: "3D Flashcard", icon: Layers },
                { id: "tree", label: "Concept Tree", icon: Brain },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = activeMode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setActiveMode(m.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Workspace Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
            {/* Left Column: Ingested Source & Audio */}
            <div className="lg:col-span-5 p-6 bg-slate-50/40 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-indigo-600" /> Source Extraction
                </span>
                <span className="text-[11px] font-mono text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  ✓ Ingested 3.8s
                </span>
              </div>

              {/* Note Preview */}
              <div className="rounded-xl bg-white p-4 border border-slate-200/80 text-xs text-slate-700 leading-relaxed font-mono space-y-2 shadow-sm">
                <p>&ldquo;{activePreset.rawNote}&rdquo;</p>
              </div>

              {/* Spoken Voice Lesson Bar */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                  >
                    {isPlayingAudio ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
                  </button>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Audio Voice Lesson</p>
                    <p className="text-[10px] text-slate-500">Synthesized spoken explainer</p>
                  </div>
                </div>

                {/* Animated Waveform */}
                <div className="flex items-center gap-1 h-4">
                  {[40, 75, 55, 90, 60, 80, 45, 70].map((h, i) => (
                    <motion.div
                      key={i}
                      animate={isPlayingAudio ? { height: ["20%", "100%", "30%"] } : { height: `${h}%` }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.08 }}
                      className="w-1 bg-indigo-600 rounded-full"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Active Study Runner */}
            <div className="lg:col-span-7 p-6 sm:p-8 space-y-5">
              {/* Mode 1: Active Recall Quiz */}
              {activeMode === "quiz" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">
                      Active Recall MCQ
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">Click an option to test</span>
                  </div>

                  <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 leading-snug">
                    {activePreset.sampleQuestion}
                  </h3>

                  <div className="space-y-2">
                    {activePreset.options.map((opt) => {
                      const isSelected = selectedOption === opt;
                      const isCorrect = opt === activePreset.correctAnswer;

                      let style = "border-slate-200 bg-white hover:bg-slate-50 text-slate-700";
                      if (selectedOption) {
                        if (isCorrect) {
                          style = "border-emerald-400 bg-emerald-50 text-emerald-900 font-semibold shadow-sm";
                        } else if (isSelected && !isCorrect) {
                          style = "border-rose-300 bg-rose-50 text-rose-900";
                        } else {
                          style = "opacity-40 border-slate-200";
                        }
                      }

                      return (
                        <button
                          key={opt}
                          onClick={() => setSelectedOption(opt)}
                          className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm font-medium transition-all ${style}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {selectedOption && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1"
                    >
                      <p className="font-semibold text-slate-900">
                        {selectedOption === activePreset.correctAnswer ? "✓ Active Recall Verified" : "💡 Model Feedback"}
                      </p>
                      <p className="leading-relaxed">{activePreset.explanation}</p>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Mode 2: 3D Flashcard */}
              {activeMode === "flashcard" && (
                <div className="space-y-4">
                  <div
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="cursor-pointer min-h-[180px] rounded-2xl border border-slate-200 bg-white p-6 flex flex-col justify-between shadow-sm hover:border-slate-300 transition-all"
                  >
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold block mb-2">
                        {isFlipped ? "Answer (Back)" : "Active Recall Prompt (Front)"}
                      </span>
                      <h4 className="font-display text-base sm:text-lg font-bold text-slate-900">
                        {isFlipped ? activePreset.flashcardBack : activePreset.flashcardFront}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                      <span className="text-slate-400">Click to flip card</span>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowHook(!showHook);
                        }}
                        className="text-indigo-600 font-medium hover:underline cursor-pointer"
                      >
                        {showHook ? activePreset.memoryHook : "💡 Memory Hook Hint"}
                      </span>
                    </div>
                  </div>

                  {/* SuperMemo Confidence Ratings */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] text-slate-500 font-mono">Next Interval:</span>
                    <div className="flex gap-1.5 text-xs">
                      <span className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                        Again · 10m
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-medium">
                        Hard · 1d
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium">
                        Good · 3d
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 font-medium">
                        Easy · 7d
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Mode 3: Concept Hierarchy Tree */}
              {activeMode === "tree" && (
                <div className="space-y-2.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                    Hierarchical Knowledge Roots
                  </span>
                  {activePreset.concepts.map((c, idx) => (
                    <div
                      key={c.name}
                      className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-slate-700 text-xs font-mono font-bold">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-slate-900">{c.name}</p>
                          <p className="text-xs text-slate-500">{c.level}</p>
                        </div>
                      </div>
                      <span
                        className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
                          c.status === "mastered"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {c.status === "mastered" ? "Mastered (EF 2.7)" : "In Review"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── 3. Three Core Methodologies ─── */}
      <section className="mx-auto mt-24 max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="display text-3xl sm:text-4xl font-extrabold text-slate-900">
            Why traditional studying fails
          </h2>
          <p className="mt-2 text-sm text-slate-600 max-w-lg mx-auto">
            Highlighting and passive rereading create an illusion of competence. Real retention requires three cognitive mechanics:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <LiquidGlassCard depth="low" className="p-7 border-slate-200/90 bg-white/95">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 mb-4">
              <Target className="h-5 w-5" />
            </div>
            <h3 className="font-display text-lg font-bold text-slate-900">1. Active Retrieval</h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Instead of reading the answer, you are forced to retrieve it from memory. This strengthens neural pathways and exposes true understanding gaps.
            </p>
          </LiquidGlassCard>

          <LiquidGlassCard depth="low" className="p-7 border-slate-200/90 bg-white/95">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-100 mb-4">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className="font-display text-lg font-bold text-slate-900">2. SM-2 Spaced Intervals</h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Calculates the mathematical decay date for every concept. You review right before you forget, moving ideas into permanent storage with minimal effort.
            </p>
          </LiquidGlassCard>

          <LiquidGlassCard depth="low" className="p-7 border-slate-200/90 bg-white/95">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100 mb-4">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="font-display text-lg font-bold text-slate-900">3. Automatic Rescue Ladder</h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Struggling with a concept? The Remediation Coach automatically shifts teaching strategies—from analogies to first-principles—until you understand.
            </p>
          </LiquidGlassCard>
        </div>
      </section>

      {/* ─── 4. Bottom CTA ─── */}
      <section className="mx-auto mt-24 max-w-4xl text-center">
        <LiquidGlassCard depth="medium" className="p-10 sm:p-14 border-slate-200/90 bg-white/95 shadow-xl">
          <h2 className="display text-3xl sm:text-5xl font-extrabold text-slate-900">
            Build your study system today.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-slate-600">
            Free to use. Upload your notes or choose a sample study set to see the engine in action.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/upload">
              <LiquidGlassButton size="lg" icon={<ArrowRight className="h-4 w-4" />}>
                Create Study Hub Free →
              </LiquidGlassButton>
            </Link>
          </div>
        </LiquidGlassCard>
      </section>
    </main>
  );
}
