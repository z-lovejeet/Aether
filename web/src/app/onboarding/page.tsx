"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { LiquidGlassCard } from "@/components/glass/LiquidGlassCard";
import { LiquidGlassButton } from "@/components/glass/LiquidGlassButton";
import { startRun, pollRunUntilDone } from "@/lib/agent-client";

interface Question {
  id: string;
  title: string;
  subtitle: string;
  type: "single" | "multi";
  options: { label: string; desc?: string; icon?: string; tag?: string }[];
}

const QUESTIONS: Question[] = [
  {
    id: "style",
    title: "How do you prefer unfamiliar concepts explained?",
    subtitle: "This defines how our Content Forge structures initial definitions.",
    type: "single",
    options: [
      { label: "Analogy & Metaphors", desc: "Compare new ideas to real-world objects and familiar systems", icon: "💡", tag: "analogy" },
      { label: "Visual & Coordinate Maps", desc: "Diagrams, directional flows, and spatial structures", icon: "📐", tag: "visual" },
      { label: "Algorithmic Step-by-Step", desc: "Precise numbered sequences with strict cause & effect", icon: "🔢", tag: "steps" },
      { label: "First-Principles Simplicity", desc: "Plain English with all unnecessary jargon removed", icon: "🌱", tag: "simpler" },
    ],
  },
  {
    id: "modality",
    title: "What is your primary sensory learning mode?",
    subtitle: "We will prioritize generating audio voice lessons or visual summaries accordingly.",
    type: "single",
    options: [
      { label: "Visual (Diagrams & Structure)", desc: "Color-coded trees, mind maps, and structured formatting", icon: "🎨", tag: "visual" },
      { label: "Auditory (Spoken Voice)", desc: "Spoken voice explainers and audio review sessions", icon: "🎙️", tag: "auditory" },
      { label: "Dual Coding (Text + Spoken)", desc: "Reading synchronized with real-time text-to-speech", icon: "⚡", tag: "multimodal" },
    ],
  },
  {
    id: "interests",
    title: "What hobbies or topics energize you?",
    subtitle: "Select all that apply — Flashcard Smith will use these as memory hooks.",
    type: "multi",
    options: [
      { label: "Basketball & Athletics", icon: "🏀" },
      { label: "Video Games & RPGs", icon: "🎮" },
      { label: "Space & Astronomy", icon: "🚀" },
      { label: "Music & Audio Production", icon: "🎵" },
      { label: "Finance & Investing", icon: "📈" },
      { label: "Filmmaking & Sci-Fi", icon: "🎬" },
      { label: "Cooking & Culinary Arts", icon: "🍳" },
      { label: "Coding & AI", icon: "💻" },
    ],
  },
  {
    id: "pace",
    title: "What is your target study rhythm?",
    subtitle: "Controls spaced-repetition initial intervals and difficulty ramp.",
    type: "single",
    options: [
      { label: "Fast & High Density", desc: "Jump straight into hard conceptual tests with short review cycles", icon: "⚡", tag: "fast" },
      { label: "Balanced Mastery", desc: "Balanced difficulty progression with standard SM-2 intervals", icon: "⚖️", tag: "balanced" },
      { label: "Deep & Methodical", desc: "Thorough foundational drilling before advancing to synthesis", icon: "🧘", tag: "deep" },
    ],
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({
    style: "analogy",
    modality: "multimodal",
    interests: ["Space & Astronomy", "Coding & AI"],
    pace: "balanced",
  });
  const [saving, setSaving] = useState(false);

  const currentQ = QUESTIONS[step];
  const progressPct = ((step + 1) / QUESTIONS.length) * 100;

  function handleSelect(opt: any) {
    if (currentQ.type === "single") {
      setAnswers((prev) => ({ ...prev, [currentQ.id]: opt.tag || opt.label }));
      if (step < QUESTIONS.length - 1) {
        setStep((s) => s + 1);
      }
    } else {
      const currentList = (answers[currentQ.id] as string[]) || [];
      const exists = currentList.includes(opt.label);
      const updated = exists ? currentList.filter((i) => i !== opt.label) : [...currentList, opt.label];
      setAnswers((prev) => ({ ...prev, [currentQ.id]: updated }));
    }
  }

  async function handleFinish() {
    setSaving(true);
    const profile = {
      archetype: `${answers.style === "analogy" ? "Metaphorical" : "Systematic"} ${answers.modality === "visual" ? "Visualizer" : "Synthesizer"}`,
      primaryStyle: answers.style,
      modality: answers.modality,
      interests: answers.interests,
      pace: answers.pace,
      bestStrategy: answers.style,
    };

    if (typeof window !== "undefined") {
      localStorage.setItem("learning_dna", JSON.stringify(profile));
    }

    try {
      const sid = crypto.randomUUID();
      const { runId } = await startRun(sid, "profile_update", { learningDNA: profile });
      await pollRunUntilDone(runId);
    } catch {
      /* ignore */
    }

    router.push("/upload");
  }

  return (
    <main className="relative min-h-screen px-4 pb-24 sm:px-8">
      <div className="mx-auto max-w-2xl pt-6 sm:pt-10">
        {/* Top Progress Track */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold text-slate-900">Step {step + 1} of {QUESTIONS.length}</span>
            <span>{Math.round(progressPct)}% Completed</span>
          </div>
          <div className="h-1.5 w-full bg-slate-200/80 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-slate-900 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
        </div>

        {/* Question Container Card */}
        <LiquidGlassCard depth="medium" className="p-7 sm:p-10 border-slate-200/90 bg-white/95">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQ.id}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="display text-xl sm:text-2xl font-bold text-slate-900">
                {currentQ.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-6">
                {currentQ.subtitle}
              </p>

              {/* Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentQ.options.map((opt) => {
                  const isSelected =
                    currentQ.type === "single"
                      ? answers[currentQ.id] === (opt.tag || opt.label)
                      : (answers[currentQ.id] as string[])?.includes(opt.label);

                  return (
                    <button
                      key={opt.label}
                      onClick={() => handleSelect(opt)}
                      className={`text-left p-4 rounded-2xl border transition-all duration-150 flex items-start gap-3.5 ${
                        isSelected
                          ? "border-slate-900 bg-slate-50 text-slate-900 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
                      }`}
                    >
                      <span className="text-xl shrink-0 p-1.5 rounded-xl bg-slate-50 border border-slate-200">
                        {opt.icon}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-display text-xs sm:text-sm font-bold text-slate-900">{opt.label}</h4>
                          {isSelected && <CheckCircle2 className="h-4 w-4 text-slate-900 shrink-0" />}
                        </div>
                        {opt.desc && (
                          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{opt.desc}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Controls */}
          <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 disabled:opacity-0"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            {step < QUESTIONS.length - 1 ? (
              <LiquidGlassButton
                onClick={() => setStep((s) => s + 1)}
                size="md"
                icon={<ArrowRight className="h-4 w-4" />}
              >
                Next Step
              </LiquidGlassButton>
            ) : (
              <LiquidGlassButton
                onClick={handleFinish}
                loading={saving}
                size="md"
                icon={<ArrowRight className="h-4 w-4" />}
              >
                Save & Continue
              </LiquidGlassButton>
            )}
          </div>
        </LiquidGlassCard>
      </div>
    </main>
  );
}
