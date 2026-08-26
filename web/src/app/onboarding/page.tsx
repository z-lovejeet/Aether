"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AuroraBackground } from "@/components/glass/AuroraBackground";
import { GlassCard } from "@/components/glass/GlassCard";
import { startRun, pollRunUntilDone } from "@/lib/agent-client";

interface OnboardingData {
  goal: "exam" | "coursework" | "selflearn" | "teaching";
  subject: string;
  level: "beginner" | "intermediate" | "advanced";
  explanationStyle: "examples" | "analogies" | "steps" | "visual";
  interests: string[];
  sessionLengthMin: 5 | 15 | 30;
  cadence: "daily" | "few_weekly" | "cram";
  modality: "read" | "listen" | "both";
  language: string;
}

const DEFAULT_DATA: OnboardingData = {
  goal: "exam",
  subject: "Biology",
  level: "beginner",
  explanationStyle: "analogies",
  interests: ["gaming", "space"],
  sessionLengthMin: 15,
  cadence: "daily",
  modality: "read",
  language: "en",
};

const INTEREST_OPTIONS = [
  { id: "football", label: "Football", emoji: "⚽" },
  { id: "cricket", label: "Cricket", emoji: "🏏" },
  { id: "gaming", label: "Gaming", emoji: "🎮" },
  { id: "music", label: "Music", emoji: "🎵" },
  { id: "cooking", label: "Cooking", emoji: "🍳" },
  { id: "space", label: "Space", emoji: "🚀" },
  { id: "tech", label: "Tech & AI", emoji: "📱" },
  { id: "movies", label: "Movies & Anime", emoji: "🎬" },
  { id: "basketball", label: "Basketball", emoji: "🏀" },
  { id: "books", label: "Books & Stories", emoji: "📚" },
  { id: "art", label: "Art & Design", emoji: "🎨" },
  { id: "f1", label: "Formula 1", emoji: "🏎️" },
];

const SUBJECT_SUGGESTIONS = [
  "Biology",
  "Organic Chemistry",
  "World History",
  "Computer Science",
  "Physics",
  "Economics",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(DEFAULT_DATA);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSteps = 8;

  function updateField<K extends keyof OnboardingData>(field: K, value: OnboardingData[K]) {
    setData((prev) => ({ ...prev, [field]: value }));
  }

  function toggleInterest(interestId: string) {
    setData((prev) => {
      const exists = prev.interests.includes(interestId);
      let updated: string[];
      if (exists) {
        updated = prev.interests.filter((i) => i !== interestId);
      } else {
        if (prev.interests.length >= 4) {
          updated = [...prev.interests.slice(1), interestId];
        } else {
          updated = [...prev.interests, interestId];
        }
      }
      return { ...prev, interests: updated.length ? updated : ["general"] };
    });
  }

  async function handleFinish(answers: OnboardingData = data) {
    setBusy(true);
    setError(null);
    try {
      const sid = crypto.randomUUID();
      const { runId } = await startRun(sid, "profile_update", {
        onboardingAnswers: answers,
        subject: answers.subject,
        level: answers.level,
      });

      const run = await pollRunUntilDone(runId);
      if (run.status === "done" && run.result?.learningDNA) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("mastery_dna", JSON.stringify(run.result.learningDNA));
          sessionStorage.setItem("mastery_subject", answers.subject);
          sessionStorage.setItem("mastery_level", answers.level);
        }
        router.push("/upload");
      } else {
        // Even if background agent run had warnings, save locally and continue
        if (typeof window !== "undefined") {
          sessionStorage.setItem("mastery_dna", JSON.stringify(answers));
        }
        router.push("/upload");
      }
    } catch (err) {
      console.warn("Onboarding API warning:", err);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("mastery_dna", JSON.stringify(answers));
      }
      router.push("/upload");
    } finally {
      setBusy(false);
    }
  }

  function handleSkip() {
    handleFinish(DEFAULT_DATA);
  }

  function nextStep() {
    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
    } else {
      handleFinish();
    }
  }

  function prevStep() {
    if (step > 0) {
      setStep((s) => s - 1);
    }
  }

  if (busy) {
    return (
      <main className="relative flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
        <AuroraBackground />
        <div className="glass flex h-20 w-20 items-center justify-center rounded-3xl text-4xl shadow-2xl animate-bounce">
          🧬
        </div>
        <h2 className="display text-3xl font-bold">Synthesizing your Learning DNA…</h2>
        <p className="max-w-md animate-pulse text-sm text-[var(--text-secondary)]">
          Calibrating explanation models, analogy frameworks, and review frequencies.
        </p>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-between px-6 py-10">
      <AuroraBackground />

      {/* Header bar */}
      <div className="w-full max-w-2xl flex items-center justify-between">
        <Link
          href="/"
          className="text-xs uppercase tracking-widest text-[var(--text-secondary)] hover:text-white transition-colors"
        >
          Mastery Engine
        </Link>
        <button
          onClick={handleSkip}
          className="text-xs text-[var(--text-secondary)] hover:text-[var(--aurora-2)] transition-colors underline"
        >
          Skip to upload →
        </button>
      </div>

      {/* Main card container */}
      <div className="my-auto w-full max-w-xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.98 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            <GlassCard className="p-8 sm:p-10" interactive>
              {/* Step 1: Goal */}
              {step === 0 && (
                <div>
                  <span className="text-3xl">🎯</span>
                  <h2 className="display mt-3 text-3xl font-bold">What is your primary goal?</h2>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    We adapt the depth, question formats, and urgency accordingly.
                  </p>
                  <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[
                      { id: "exam", label: "Exam Preparation", icon: "🏆", desc: "Target high test scores" },
                      { id: "coursework", label: "School / College", icon: "📚", desc: "Keep up with classes" },
                      { id: "selflearn", label: "Curiosity & Growth", icon: "💡", desc: "Master topics at my pace" },
                      { id: "teaching", label: "Teaching / Prep", icon: "👩‍🏫", desc: "Create lessons & explain" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          updateField("goal", opt.id as OnboardingData["goal"]);
                        }}
                        className={`glass glass-hover flex flex-col items-start p-4 text-left transition-all rounded-2xl ${
                          data.goal === opt.id
                            ? "border border-[var(--color-accent)] bg-[rgba(139,92,246,0.18)] shadow-lg shadow-purple-500/20"
                            : "opacity-80 hover:opacity-100"
                        }`}
                      >
                        <span className="text-xl">{opt.icon}</span>
                        <span className="mt-2 font-display text-sm font-semibold text-white">{opt.label}</span>
                        <span className="text-xs text-[var(--text-secondary)]">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Subject */}
              {step === 1 && (
                <div>
                  <span className="text-3xl">📖</span>
                  <h2 className="display mt-3 text-3xl font-bold">What subject are you studying?</h2>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    You can always add more subjects or textbooks later.
                  </p>
                  <input
                    type="text"
                    value={data.subject}
                    onChange={(e) => updateField("subject", e.target.value)}
                    placeholder="e.g. AP Biology, Organic Chemistry, World History..."
                    className="glass mt-6 w-full rounded-2xl p-4 text-base outline-none placeholder:text-white/30 focus:border focus:border-[var(--color-accent)]"
                    autoFocus
                  />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="text-xs text-[var(--text-secondary)] self-center mr-1">Suggestions:</span>
                    {SUBJECT_SUGGESTIONS.map((subj) => (
                      <button
                        key={subj}
                        type="button"
                        onClick={() => updateField("subject", subj)}
                        className={`rounded-full px-3 py-1 text-xs transition-all ${
                          data.subject === subj
                            ? "bg-[var(--color-accent)] text-white font-medium"
                            : "glass glass-hover text-[var(--text-secondary)]"
                        }`}
                      >
                        {subj}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Level */}
              {step === 2 && (
                <div>
                  <span className="text-3xl">🌱</span>
                  <h2 className="display mt-3 text-3xl font-bold">What is your current level?</h2>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Calibrates initial question difficulty and concept granularity.
                  </p>
                  <div className="mt-6 space-y-3">
                    {[
                      { id: "beginner", label: "Beginner", icon: "🌱", desc: "First time encountering these concepts" },
                      { id: "intermediate", label: "Intermediate", icon: "🌿", desc: "Familiar with fundamentals, need mastery" },
                      { id: "advanced", label: "Advanced", icon: "🌳", desc: "Fast review & challenging edge cases" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateField("level", opt.id as OnboardingData["level"])}
                        className={`glass glass-hover flex w-full items-center gap-4 p-4 text-left rounded-2xl transition-all ${
                          data.level === opt.id
                            ? "border border-[var(--color-accent)] bg-[rgba(139,92,246,0.18)] shadow-lg shadow-purple-500/20"
                            : "opacity-80 hover:opacity-100"
                        }`}
                      >
                        <span className="text-2xl">{opt.icon}</span>
                        <div>
                          <p className="font-display text-sm font-semibold text-white">{opt.label}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{opt.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 4: Explanation Style */}
              {step === 3 && (
                <div>
                  <span className="text-3xl">🎭</span>
                  <h2 className="display mt-3 text-3xl font-bold">How do you learn best?</h2>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Our Remediation Coach starts with this style when clarifying confusing topics.
                  </p>
                  <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[
                      { id: "analogies", label: "Analogies & Metaphors", icon: "⚽", desc: "Explain like football, gaming, etc." },
                      { id: "examples", label: "Real-world Examples", icon: "🔍", desc: "Concrete case studies & applications" },
                      { id: "steps", label: "Step-by-step Logic", icon: "🔢", desc: "Numbered sequential algorithms" },
                      { id: "visual", label: "Visual Descriptions", icon: "🎨", desc: "Spatial mental models & graphs" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateField("explanationStyle", opt.id as OnboardingData["explanationStyle"])}
                        className={`glass glass-hover flex flex-col items-start p-4 text-left rounded-2xl transition-all ${
                          data.explanationStyle === opt.id
                            ? "border border-[var(--color-accent)] bg-[rgba(139,92,246,0.18)] shadow-lg shadow-purple-500/20"
                            : "opacity-80 hover:opacity-100"
                        }`}
                      >
                        <span className="text-xl">{opt.icon}</span>
                        <span className="mt-2 font-display text-sm font-semibold text-white">{opt.label}</span>
                        <span className="text-xs text-[var(--text-secondary)]">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 5: Interests */}
              {step === 4 && (
                <div>
                  <span className="text-3xl">✨</span>
                  <h2 className="display mt-3 text-3xl font-bold">Pick your top interests</h2>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    We use these to create tailored memory hooks and flashcard hints.
                  </p>
                  <div className="mt-6 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                    {INTEREST_OPTIONS.map((item) => {
                      const selected = data.interests.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleInterest(item.id)}
                          className={`glass flex flex-col items-center justify-center p-3 rounded-2xl transition-all ${
                            selected
                              ? "border border-[var(--color-accent)] bg-[rgba(139,92,246,0.22)] scale-[1.03] shadow-md shadow-purple-500/30"
                              : "glass-hover opacity-75 hover:opacity-100"
                          }`}
                        >
                          <span className="text-2xl">{item.emoji}</span>
                          <span className="mt-1 text-center text-xs font-medium text-white">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 6: Session Length */}
              {step === 5 && (
                <div>
                  <span className="text-3xl">⏱️</span>
                  <h2 className="display mt-3 text-3xl font-bold">Typical session length?</h2>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Quizzes and review queues will size themselves to fit your schedule.
                  </p>
                  <div className="mt-6 space-y-3">
                    {[
                      { id: 5, label: "5 Minutes", icon: "⚡", desc: "Quick micro-reviews & flashcards" },
                      { id: 15, label: "15 Minutes", icon: "⏱️", desc: "Standard focused sprint with remediation" },
                      { id: 30, label: "30 Minutes", icon: "🧘", desc: "Comprehensive deep study session" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateField("sessionLengthMin", opt.id as OnboardingData["sessionLengthMin"])}
                        className={`glass glass-hover flex w-full items-center gap-4 p-4 text-left rounded-2xl transition-all ${
                          data.sessionLengthMin === opt.id
                            ? "border border-[var(--color-accent)] bg-[rgba(139,92,246,0.18)] shadow-lg shadow-purple-500/20"
                            : "opacity-80 hover:opacity-100"
                        }`}
                      >
                        <span className="text-2xl">{opt.icon}</span>
                        <div>
                          <p className="font-display text-sm font-semibold text-white">{opt.label}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{opt.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 7: Cadence */}
              {step === 6 && (
                <div>
                  <span className="text-3xl">📅</span>
                  <h2 className="display mt-3 text-3xl font-bold">How often will you review?</h2>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Powers the SM-2 spaced repetition decay algorithms.
                  </p>
                  <div className="mt-6 space-y-3">
                    {[
                      { id: "daily", label: "Daily Habit", icon: "🔥", desc: "Optimal retention curve (Recommended)" },
                      { id: "few_weekly", label: "2–3 Times a Week", icon: "🗓️", desc: "Moderate spaced repetition intervals" },
                      { id: "cram", label: "Intense Cram Sessions", icon: "⚡", desc: "Compressed intervals leading up to exam" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateField("cadence", opt.id as OnboardingData["cadence"])}
                        className={`glass glass-hover flex w-full items-center gap-4 p-4 text-left rounded-2xl transition-all ${
                          data.cadence === opt.id
                            ? "border border-[var(--color-accent)] bg-[rgba(139,92,246,0.18)] shadow-lg shadow-purple-500/20"
                            : "opacity-80 hover:opacity-100"
                        }`}
                      >
                        <span className="text-2xl">{opt.icon}</span>
                        <div>
                          <p className="font-display text-sm font-semibold text-white">{opt.label}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{opt.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 8: Modality */}
              {step === 7 && (
                <div>
                  <span className="text-3xl">🎧</span>
                  <h2 className="display mt-3 text-3xl font-bold">Reading or listening?</h2>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Choose how you want study material delivered.
                  </p>
                  <div className="mt-6 space-y-3">
                    {[
                      { id: "read", label: "Reading & Visual", icon: "📖", desc: "Interactive markdown, diagrams & mind maps" },
                      { id: "listen", label: "Audio Lessons", icon: "🎙️", desc: "Conversational podcast-style audio overviews" },
                      { id: "both", label: "Multimodal (Both)", icon: "✨", desc: "Read along while listening to explanations" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateField("modality", opt.id as OnboardingData["modality"])}
                        className={`glass glass-hover flex w-full items-center gap-4 p-4 text-left rounded-2xl transition-all ${
                          data.modality === opt.id
                            ? "border border-[var(--color-accent)] bg-[rgba(139,92,246,0.18)] shadow-lg shadow-purple-500/20"
                            : "opacity-80 hover:opacity-100"
                        }`}
                      >
                        <span className="text-2xl">{opt.icon}</span>
                        <div>
                          <p className="font-display text-sm font-semibold text-white">{opt.label}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{opt.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <p className="mt-4 rounded-xl bg-[rgba(251,113,133,0.12)] p-3 text-sm text-[var(--color-forget)]">
                  {error}
                </p>
              )}

              {/* Navigation controls */}
              <div className="mt-8 flex items-center justify-between pt-4 border-t border-white/10">
                {step > 0 ? (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="text-sm text-[var(--text-secondary)] hover:text-white transition-colors"
                  >
                    ← back
                  </button>
                ) : (
                  <div />
                )}

                <button
                  type="button"
                  onClick={nextStep}
                  className="rounded-full bg-[var(--color-accent)] px-8 py-3 font-display text-sm font-semibold shadow-lg shadow-purple-500/30 transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97]"
                >
                  {step === totalSteps - 1 ? "Save & Start Studying →" : "Next →"}
                </button>
              </div>
            </GlassCard>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              aria-label={`Go to question ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step
                  ? "w-8 bg-[var(--color-accent)] shadow-[0_0_12px_rgba(139,92,246,0.8)]"
                  : i < step
                    ? "w-2 bg-[var(--aurora-2)] opacity-80"
                    : "w-2 bg-white/20"
              }`}
            />
          ))}
        </div>
        <span className="text-[11px] text-[var(--text-secondary)]">
          Step {step + 1} of {totalSteps}
        </span>
      </div>
    </main>
  );
}
