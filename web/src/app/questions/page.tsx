"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Zap,
  BookOpen,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Loader2,
  Cpu,
  Target,
  GraduationCap,
  Layers,
  ChevronRight,
  Lightbulb,
} from "lucide-react";
import { LiquidGlassCard } from "@/components/glass/LiquidGlassCard";
import { LiquidGlassButton } from "@/components/glass/LiquidGlassButton";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import {
  generatePracticeQuestions,
  type GeneratedPracticeItemDto,
} from "@/lib/agent-client";

const SUGGESTED_SUBJECTS = [
  { name: "Computer Science", defaultTopics: "Dynamic Programming, Graph Traversal, Binary Search Trees" },
  { name: "Mathematics & Calculus", defaultTopics: "Integration by Parts, Taylor Series, Multivariable Derivatives" },
  { name: "Physics", defaultTopics: "Quantum Mechanics, Wave-Particle Duality, Born Rule, Maxwell's Equations" },
  { name: "Organic Chemistry", defaultTopics: "Electrophilic Aromatic Substitution, SN1 vs SN2 Mechanisms, Resonance" },
  { name: "Neuroscience & Biology", defaultTopics: "Synaptic Transmission, Action Potentials, Long-Term Potentiation" },
  { name: "Machine Learning & AI", defaultTopics: "Backpropagation, Attention Mechanism, Regularization & Dropout" },
];

export default function PracticeArenaPage() {
  // Configuration State
  const [subject, setSubject] = useState("Computer Science");
  const [topics, setTopics] = useState("Dynamic Programming, Graph Traversal, Binary Search Trees");
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [count, setCount] = useState(5);
  const [goal, setGoal] = useState<"exam" | "deep_understanding" | "interview_prep" | "speed_review">("exam");

  // Execution State
  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState<GeneratedPracticeItemDto[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [shortAnswer, setShortAnswer] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Switch between "config" and "practice" views
  const isPracticeMode = questions.length > 0;
  const currentQ = questions[currentIndex];

  async function handleGenerate() {
    if (!topics.trim()) {
      setError("Please specify at least one topic to generate practice questions.");
      return;
    }
    setError(null);
    setIsGenerating(true);

    try {
      const res = await generatePracticeQuestions({
        subject: subject.trim() || "General",
        topics: topics.trim(),
        level,
        count,
        goal,
        qtypes: ["mcq", "short", "explain"],
      });

      if (res && res.questions && res.questions.length > 0) {
        setQuestions(res.questions);
        setCurrentIndex(0);
        setSelectedOption(null);
        setShortAnswer("");
        setIsSubmitted(false);
        setShowHint(false);
        setScore(0);
        setCompletedCount(0);
      } else {
        throw new Error("No questions were returned. Please try again with different topics.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGenerating(false);
    }
  }

  function handleSelectPreset(sub: typeof SUGGESTED_SUBJECTS[0]) {
    setSubject(sub.name);
    setTopics(sub.defaultTopics);
  }

  function handleSubmitAnswer() {
    if (isSubmitted || !currentQ) return;
    setIsSubmitted(true);
    setCompletedCount((c) => c + 1);

    if (currentQ.qtype === "mcq") {
      const chosenLetter = selectedOption?.trim().substring(0, 1).toUpperCase();
      const answerLetter = currentQ.answer?.trim().substring(0, 1).toUpperCase();
      if (chosenLetter && answerLetter && chosenLetter === answerLetter) {
        setScore((s) => s + 1);
      }
    } else {
      // For short/explain answers, give credit if student provided substantial response
      if (shortAnswer.trim().length > 15) {
        setScore((s) => s + 1);
      }
    }
  }

  function handleNextQuestion() {
    setSelectedOption(null);
    setShortAnswer("");
    setIsSubmitted(false);
    setShowHint(false);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      // Finished all questions
      setCurrentIndex(questions.length);
    }
  }

  function handleReset() {
    setQuestions([]);
    setCurrentIndex(0);
    setSelectedOption(null);
    setShortAnswer("");
    setIsSubmitted(false);
    setShowHint(false);
    setScore(0);
    setCompletedCount(0);
  }

  const isFinished = isPracticeMode && currentIndex >= questions.length;

  return (
    <main className="relative min-h-screen px-4 pb-24 sm:px-8">
      <div className="mx-auto max-w-4xl pt-4 sm:pt-8">
        {/* Top Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900 text-white text-xs font-semibold mb-3 shadow-xs">
            <Cpu className="h-3.5 w-3.5 text-emerald-400" />
            <span>Groq LPU Active Recall Arena</span>
          </div>
          <h1 className="display text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Targeted Deliberate Practice
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
            Generate custom exam-calibrated question sets on any subject or specific topic with instant step-by-step AI feedback.
          </p>
        </div>

        {/* ─── Error Notification ─── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="font-bold text-rose-700 hover:text-rose-900"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Mode 1: Configuration Form ─── */}
        {!isPracticeMode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <LiquidGlassCard depth="medium" className="p-6 sm:p-8 bg-white/95 border-slate-200 shadow-sm">
              <div className="space-y-6">
                {/* 1. Quick Presets */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Quick Domain Presets:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SUGGESTED_SUBJECTS.map((s) => (
                      <button
                        key={s.name}
                        onClick={() => handleSelectPreset(s)}
                        className={`p-2.5 rounded-xl text-left border text-xs transition-all ${
                          subject === s.name
                            ? "bg-slate-900 text-white border-slate-900 shadow-xs font-bold"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Subject & Specific Topics Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Subject / Discipline:
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Computer Science"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Target Topics & Concepts:
                    </label>
                    <input
                      type="text"
                      value={topics}
                      onChange={(e) => setTopics(e.target.value)}
                      placeholder="e.g. Dijkstra, Bellman-Ford, DAG Shortest Path"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* 3. Mastery Level, Goal & Count */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  {/* Difficulty */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Target Difficulty:
                    </label>
                    <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                      {(["beginner", "intermediate", "advanced"] as const).map((l) => (
                        <button
                          key={l}
                          onClick={() => setLevel(l)}
                          className={`flex-1 py-1.5 text-xs rounded-lg font-semibold capitalize transition-all ${
                            level === l
                              ? "bg-white text-slate-900 shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Learning Goal */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Learning Objective:
                    </label>
                    <select
                      value={goal}
                      onChange={(e) => setGoal(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="exam">Standard Exam & Midterm Prep</option>
                      <option value="deep_understanding">Deep Conceptual Proofs</option>
                      <option value="interview_prep">Technical Interview Challenges</option>
                      <option value="speed_review">Rapid Recall Sprint</option>
                    </select>
                  </div>

                  {/* Question Count */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Number of Items:
                    </label>
                    <div className="flex items-center gap-2">
                      {[3, 5, 8, 10].map((n) => (
                        <button
                          key={n}
                          onClick={() => setCount(n)}
                          className={`flex-1 py-2 text-xs rounded-xl border font-bold transition-all ${
                            count === n
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Submit / Generate Button */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    <span>Inference powered by <b>Groq LPU</b> (Sub-2s synthesis)</span>
                  </span>

                  <LiquidGlassButton
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    variant="primary"
                    size="md"
                    icon={isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  >
                    {isGenerating ? "Synthesizing Arena…" : "Generate Practice Set ⚡"}
                  </LiquidGlassButton>
                </div>
              </div>
            </LiquidGlassCard>
          </motion.div>
        )}

        {/* ─── Mode 2: Finished Session Summary Card ─── */}
        {isFinished && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <LiquidGlassCard depth="high" className="p-8 text-center bg-white/95 border-slate-200">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-4 border border-emerald-200">
                <GraduationCap className="h-8 w-8" />
              </div>
              <h2 className="display text-2xl font-bold text-slate-900">
                Practice Session Completed!
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                You tested {questions.length} concepts across <b>{subject}</b>.
              </p>

              <div className="mt-6 flex justify-center items-center gap-8 py-4 px-6 rounded-2xl bg-slate-50 border border-slate-200/80 max-w-sm mx-auto">
                <div>
                  <div className="text-2xl font-extrabold font-mono text-slate-900">{score}/{questions.length}</div>
                  <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Total Score</div>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                  <div className="text-2xl font-extrabold font-mono text-emerald-600">
                    {Math.round((score / questions.length) * 100)}%
                  </div>
                  <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Accuracy</div>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-center gap-3">
                <LiquidGlassButton onClick={handleReset} variant="secondary" size="sm" icon={<RotateCcw className="h-4 w-4" />}>
                  Configure New Topics
                </LiquidGlassButton>
                <LiquidGlassButton
                  onClick={() => {
                    setCurrentIndex(0);
                    setSelectedOption(null);
                    setShortAnswer("");
                    setIsSubmitted(false);
                    setShowHint(false);
                    setScore(0);
                    setCompletedCount(0);
                  }}
                  variant="primary"
                  size="sm"
                  icon={<ArrowRight className="h-4 w-4" />}
                >
                  Retry This Set
                </LiquidGlassButton>
              </div>
            </LiquidGlassCard>
          </motion.div>
        )}

        {/* ─── Mode 3: Active Question Taker ─── */}
        {isPracticeMode && !isFinished && currentQ && (
          <motion.div
            key={currentQ.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            {/* Top Navigation & Progress Bar */}
            <div className="flex items-center justify-between text-xs text-slate-600 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white font-mono font-bold text-[11px]">
                  Q{currentIndex + 1} of {questions.length}
                </span>
                <span className="font-semibold text-slate-800">{currentQ.conceptName}</span>
                <span className="text-slate-400">·</span>
                <span className="font-mono text-indigo-600 font-medium uppercase text-[10px]">
                  {currentQ.qtype}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-mono text-emerald-700 font-bold text-xs">
                  Score: {score}
                </span>
                <button
                  onClick={handleReset}
                  className="text-slate-400 hover:text-slate-700 text-[11px] underline"
                >
                  Exit Set
                </button>
              </div>
            </div>

            {/* Question Card */}
            <LiquidGlassCard depth="medium" className="p-6 sm:p-8 bg-white/95 border-slate-200">
              <div className="text-base sm:text-lg font-medium text-slate-900 leading-relaxed">
                <MarkdownRenderer content={currentQ.question} />
              </div>

              {/* ── MCQ Options View ── */}
              {currentQ.qtype === "mcq" && currentQ.options && (
                <div className="mt-6 space-y-2.5">
                  {currentQ.options.map((opt) => {
                    const isSelected = selectedOption === opt;
                    const letter = opt.trim().substring(0, 1).toUpperCase();
                    const answerLetter = currentQ.answer?.trim().substring(0, 1).toUpperCase();
                    const isCorrectAnswer = answerLetter && letter === answerLetter;

                    let btnStyle = "bg-white hover:bg-slate-50 border-slate-200 text-slate-800";
                    if (isSelected && !isSubmitted) {
                      btnStyle = "bg-indigo-50 border-indigo-500 text-indigo-950 ring-2 ring-indigo-500/20";
                    } else if (isSubmitted) {
                      if (isCorrectAnswer) {
                        btnStyle = "bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold";
                      } else if (isSelected && !isCorrectAnswer) {
                        btnStyle = "bg-rose-50 border-rose-400 text-rose-950";
                      } else {
                        btnStyle = "opacity-60 bg-slate-50 border-slate-200 text-slate-500";
                      }
                    }

                    return (
                      <button
                        key={opt}
                        onClick={() => !isSubmitted && setSelectedOption(opt)}
                        disabled={isSubmitted}
                        className={`w-full text-left p-4 rounded-xl border text-xs sm:text-sm transition-all flex items-start gap-3 ${btnStyle}`}
                      >
                        <div className="flex-1">
                          <MarkdownRenderer content={opt} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ── Short / Explain Input View ── */}
              {currentQ.qtype !== "mcq" && (
                <div className="mt-6 space-y-3">
                  <textarea
                    rows={4}
                    value={shortAnswer}
                    onChange={(e) => setShortAnswer(e.target.value)}
                    disabled={isSubmitted}
                    placeholder="Type your explanation or proof here (LaTeX math is supported)…"
                    className="w-full p-4 text-xs sm:text-sm rounded-xl border border-slate-200 text-slate-900 bg-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                  />
                </div>
              )}

              {/* Hint Accordion */}
              {currentQ.hint && (
                <div className="mt-5">
                  {!showHint ? (
                    <button
                      onClick={() => setShowHint(true)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 transition-colors"
                    >
                      <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                      <span>Need a hint? Reveal conceptual anchor</span>
                    </button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5"
                    >
                      <Lightbulb className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Conceptual Hint: </span>
                        <MarkdownRenderer content={currentQ.hint} />
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* ── Feedback & Explanation Panel ── */}
              <AnimatePresence>
                {isSubmitted && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-5 rounded-2xl border bg-slate-50/90 border-slate-200/90 text-xs space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="font-bold text-slate-900 text-sm">Model Solution & Analysis</span>
                    </div>

                    <div className="text-slate-800 leading-relaxed font-sans text-xs sm:text-sm">
                      <MarkdownRenderer content={currentQ.answer} />
                    </div>

                    {currentQ.explanation && (
                      <div className="pt-3 border-t border-slate-200/60 text-slate-600 leading-relaxed">
                        <span className="font-bold text-slate-800">Why: </span>
                        <MarkdownRenderer content={currentQ.explanation} />
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Action Bar (Submit / Next) ── */}
              <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">
                  Difficulty Level: {currentQ.difficulty}/5
                </span>

                <div className="flex items-center gap-2">
                  {!isSubmitted ? (
                    <LiquidGlassButton
                      onClick={handleSubmitAnswer}
                      disabled={(currentQ.qtype === "mcq" && !selectedOption) || (currentQ.qtype !== "mcq" && !shortAnswer.trim())}
                      variant="primary"
                      size="sm"
                    >
                      Submit Answer
                    </LiquidGlassButton>
                  ) : (
                    <LiquidGlassButton
                      onClick={handleNextQuestion}
                      variant="primary"
                      size="sm"
                      icon={<ChevronRight className="h-4 w-4" />}
                    >
                      {currentIndex < questions.length - 1 ? "Next Question" : "Complete Session"}
                    </LiquidGlassButton>
                  )}
                </div>
              </div>
            </LiquidGlassCard>
          </motion.div>
        )}
      </div>
    </main>
  );
}
