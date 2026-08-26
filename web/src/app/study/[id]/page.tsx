"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AuroraBackground } from "@/components/glass/AuroraBackground";
import { GlassCard } from "@/components/glass/GlassCard";
import type {
  ConceptNodeDto,
  GeneratedAssetsDto,
  QuizItemDto,
  FlashcardDto,
  GradeResultDto,
  RemediationStepDto,
  RemediationCheckResultDto,
  MasteryNodeDto,
  MasteryDataDto,
  ProgressDto,
  ConceptProgressDto,
  StrategyStatDto,
  WeakConceptDto,
} from "@/lib/agent-client";
import { submitAnswer, checkRemediation, getProgress } from "@/lib/agent-client";

/* SSR-safe dynamic import for React Flow (uses browser APIs) */
const MindMapView = dynamic(
  () => import("@/components/mindmap/MindMapView"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[560px] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
        <span className="ml-3 text-sm text-[var(--text-secondary)]">
          Loading mind map…
        </span>
      </div>
    ),
  },
);

type TabId = "overview" | "quiz" | "flashcards" | "cheatsheet" | "mindmap" | "progress";

interface StudyData {
  cleanedText: string;
  conceptTree: ConceptNodeDto[];
  generatedAssets: GeneratedAssetsDto;
  sourceMeta: Record<string, unknown>;
  subject?: string;
  level?: string;
  materialId?: string;
}

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "📖" },
  { id: "quiz", label: "Quiz", icon: "🎯" },
  { id: "flashcards", label: "Flashcards", icon: "🃏" },
  { id: "cheatsheet", label: "Cheat Sheet", icon: "📋" },
  { id: "mindmap", label: "Mind Map", icon: "🧠" },
  { id: "progress", label: "Progress", icon: "📊" },
];


const DIFF_COLORS = ["#34d399", "#34d399", "#fbbf24", "#fbbf24", "#fb7185"];

export default function StudyPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [tab, setTab] = useState<TabId>("overview");
  const [data, setData] = useState<StudyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    const raw = sessionStorage.getItem(`study:${sessionId}`) || sessionStorage.getItem(`ingest:${sessionId}`);
    if (raw) {
      try {
        setData(JSON.parse(raw) as StudyData);
      } catch (err) {
        console.error("Failed to parse study data:", err);
      }
    }
    setLoading(false);
  }, [sessionId]);

  if (loading) {
    return (
      <main className="relative flex min-h-dvh flex-col items-center justify-center px-6">
        <AuroraBackground />
        <p className="animate-pulse text-sm text-[var(--text-secondary)]">Loading your study system…</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="relative flex min-h-dvh flex-col items-center justify-center px-6">
        <AuroraBackground />
        <GlassCard className="max-w-md p-8 text-center" interactive>
          <span className="text-4xl">🔍</span>
          <h2 className="display mt-4 text-2xl font-bold">No Study System Found</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            We couldn&apos;t find study assets for this session. Please upload a new chapter or note.
          </p>
          <Link
            href="/upload"
            className="mt-6 inline-block rounded-full bg-[var(--color-accent)] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/30"
          >
            Upload Material →
          </Link>
        </GlassCard>
      </main>
    );
  }

  const { conceptTree = [], generatedAssets = {}, subject = "Biology", level = "intermediate" } = data;
  const quizItems = generatedAssets.quizItems || [];
  const flashcards = generatedAssets.flashcards || [];

  return (
    <main className="relative min-h-dvh px-4 py-8 sm:px-8 sm:py-12">
      <AuroraBackground />

      <div className="mx-auto max-w-5xl">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/upload"
            className="text-xs uppercase tracking-widest text-[var(--text-secondary)] hover:text-white transition-colors"
          >
            ← Upload another material
          </Link>
          <div className="flex items-center gap-2">
            <span className="glass rounded-full px-3 py-1 text-xs text-[var(--text-secondary)]">
              Subject: <b className="text-white">{subject}</b>
            </span>
            <span className="glass rounded-full px-3 py-1 text-xs capitalize text-[var(--aurora-2)]">
              {level}
            </span>
          </div>
        </div>

        {/* Header */}
        <div className="mt-6">
          <h1 className="display text-3xl font-bold sm:text-4xl">
            {conceptTree[0]?.name ? `${conceptTree[0].name} Study Hub` : "Your Mastery Hub"}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Personalized explainer, adaptive quiz, flashcards & cheat sheet tuned to your Learning DNA.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-white/10 pb-4">
          {TABS.map((t) => {
            const isActive = tab === t.id;
            let countBadge: number | null = null;
            if (t.id === "quiz") countBadge = quizItems.length;
            if (t.id === "flashcards") countBadge = flashcards.length;
            if (t.id === "mindmap") countBadge = conceptTree.length;
            if (t.id === "progress") countBadge = conceptTree.length;

            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[var(--color-accent)] text-white font-semibold shadow-lg shadow-purple-500/30 scale-[1.02]"
                    : "glass glass-hover text-[var(--text-secondary)] hover:text-white"
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
                {countBadge !== null && countBadge > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[11px] ${
                      isActive ? "bg-white/25 text-white" : "bg-white/10 text-[var(--text-secondary)]"
                    }`}
                  >
                    {countBadge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Panels */}
        <div className="mt-8">
          {tab === "overview" && (
            <OverviewTab
              explainerMd={generatedAssets.explainerMd || data.cleanedText}
              conceptTree={conceptTree}
              onNavigateToQuiz={() => setTab("quiz")}
            />
          )}

          {tab === "quiz" && (
            <QuizTab
              quizItems={quizItems}
              conceptTree={conceptTree}
              onReviewFlashcards={() => setTab("flashcards")}
            />
          )}

          {tab === "flashcards" && (
            <FlashcardsTab flashcards={flashcards} />
          )}

          {tab === "cheatsheet" && (
            <CheatSheetTab
              cheatSheetMd={generatedAssets.cheatSheetMd || generatedAssets.explainerMd || data.cleanedText}
              subject={subject}
            />
          )}

          {tab === "mindmap" && (
            <MindMapView
              materialId={data?.materialId}
              conceptTree={conceptTree}
              onNavigateToQuiz={() => setTab("quiz")}
            />
          )}

          {tab === "progress" && (
            <ProgressTab materialId={data?.materialId} />
          )}
        </div>
      </div>
    </main>
  );
}

/* =========================================================================
   TAB 1: Overview Tab (Personalized Explainer + TTS Audio)
   ========================================================================= */

function OverviewTab({
  explainerMd,
  conceptTree,
  onNavigateToQuiz,
}: {
  explainerMd: string;
  conceptTree: ConceptNodeDto[];
  onNavigateToQuiz: () => void;
}) {
  const [speaking, setSpeaking] = useState(false);

  function handleSpeak() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Text-to-speech is not supported in this browser.");
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const cleanText = explainerMd.replace(/[#*`_>]/g, "").slice(0, 3000);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  // Parse markdown sections into structured reading blocks
  const sections = explainerMd.split(/(?=^##\s+)/m).filter((s) => s.trim().length > 0);

  return (
    <div className="space-y-6">
      {/* Quick Audio & Action Bar */}
      <GlassCard className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleSpeak}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
              speaking
                ? "bg-[var(--color-forget)] text-white shadow-lg shadow-rose-500/30 animate-pulse"
                : "glass glass-hover text-white"
            }`}
          >
            <span>{speaking ? "⏹ Stop Audio" : "🔊 Listen to Lesson"}</span>
          </button>
          <span className="text-xs text-[var(--text-secondary)]">
            {sections.length} core concept modules
          </span>
        </div>

        <button
          onClick={onNavigateToQuiz}
          className="rounded-full bg-[var(--color-accent)] px-5 py-2 text-xs font-semibold shadow-lg shadow-purple-500/25 transition-transform hover:scale-[1.02] active:scale-[0.97]"
        >
          Test your memory with Quiz →
        </button>
      </GlassCard>

      {/* Explainer Sections */}
      <div className="space-y-6">
        {sections.map((sec, idx) => {
          const lines = sec.trim().split("\n");
          const titleLine = lines[0].replace(/^##\s*/, "");
          const contentLines = lines.slice(1).join("\n");

          return (
            <GlassCard key={idx} className="p-6 sm:p-8" interactive>
              <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-accent)] text-xs font-bold text-white">
                  {idx + 1}
                </span>
                <h2 className="display text-xl font-bold text-white sm:text-2xl">{titleLine}</h2>
              </div>
              <div className="mt-4 whitespace-pre-wrap font-body text-sm leading-relaxed text-[var(--text-primary)]">
                {contentLines}
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================================
   TAB 2: Quiz Tab (Interactive Adaptive Active-Recall Runner)
   ========================================================================= */

function QuizTab({
  quizItems,
  conceptTree,
  onReviewFlashcards,
}: {
  quizItems: QuizItemDto[];
  conceptTree: ConceptNodeDto[];
  onReviewFlashcards: () => void;
}) {
  const params = useParams();
  const sessionId = Array.isArray(params.id) ? params.id[0] : (params.id ?? "");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [shortAnswerInput, setShortAnswerInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [grading, setGrading] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [gradeResult, setGradeResult] = useState<GradeResultDto | null>(null);

  // Phase 6: Remediation Coach state
  const [remediation, setRemediation] = useState<RemediationStepDto | null>(null);
  const [remediationInput, setRemediationInput] = useState("");
  const [remediationGrading, setRemediationGrading] = useState(false);
  const [remediationResult, setRemediationResult] = useState<RemediationCheckResultDto | null>(null);

  if (!quizItems.length) {
    return (
      <GlassCard className="p-8 text-center">
        <span className="text-3xl">🎯</span>
        <h3 className="display mt-3 text-xl font-semibold">Quiz Bank Generating</h3>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Quiz items are being processed from your concept tree. Check back shortly.
        </p>
      </GlassCard>
    );
  }

  const currentItem = quizItems[currentIndex];
  const isMcq = currentItem.qtype === "mcq" && Array.isArray(currentItem.options) && currentItem.options.length > 0;

  async function handleSubmitAnswer() {
    if (submitted || grading) return;

    const responseText = isMcq
      ? (selectedOption ?? "")
      : shortAnswerInput.trim();

    if (!responseText) return;

    // If quiz item has a DB id, use server-side grading
    if (currentItem.id) {
      setGrading(true);
      try {
        const result = await submitAnswer(sessionId, currentItem.id, responseText);
        setGradeResult(result.grade);
        if (result.grade.verdict === "correct") {
          setScore((s) => s + 1);
        } else if (result.grade.verdict === "partial") {
          setScore((s) => s + 0.5);
        }

        // Check if Remediation Coach was triggered (fail_count >= 2)
        if (result.remediation && !result.remediation.isComplete) {
          setRemediation(result.remediation);
        }
      } catch (err) {
        console.error("Grading API failed, falling back to client-side:", err);
        // Fallback to client-side grading
        const clientCorrect = isMcq
          ? selectedOption?.trim().toUpperCase().startsWith(currentItem.answer.trim().toUpperCase())
          : false;
        setGradeResult({
          verdict: clientCorrect ? "correct" : "wrong",
          score: clientCorrect ? 1.0 : 0.0,
          misconception: null,
          feedbackMd: clientCorrect
            ? "✨ Correct! Well done."
            : `Review this concept. The expected answer is: ${currentItem.answer}`,
        });
        if (clientCorrect) setScore((s) => s + 1);
      } finally {
        setGrading(false);
        setSubmitted(true);
      }
    } else {
      // No DB id — client-side grading only
      const clientCorrect = isMcq
        ? selectedOption?.trim().toUpperCase().startsWith(currentItem.answer.trim().toUpperCase())
        : false;
      setGradeResult({
        verdict: clientCorrect ? "correct" : "wrong",
        score: clientCorrect ? 1.0 : 0.0,
        misconception: null,
        feedbackMd: clientCorrect
          ? "✨ Correct! Well done."
          : isMcq
            ? "Not quite — review this concept and try again."
            : `Model Answer:\n${currentItem.answer}`,
      });
      if (clientCorrect) setScore((s) => s + 1);
      setSubmitted(true);
    }
  }

  async function handleRemediationSubmit() {
    if (!remediation || !remediationInput.trim() || remediationGrading) return;
    setRemediationGrading(true);
    try {
      const result = await checkRemediation(
        sessionId,
        currentItem.conceptId || "",
        currentItem.id || "",
        remediation.strategy || "",
        remediation.microCheckAnswer || "",
        remediationInput.trim(),
        remediation.triedStrategies || [],
      );
      setRemediationResult(result);
      if (result.passed && result.rescued) {
        // Concept rescued! Increment score bonus
        setScore((s) => s + 0.5);
      } else if (!result.passed && result.nextStep) {
        // Advance ladder after short delay so user sees feedback
        setTimeout(() => {
          setRemediation(result.nextStep!);
          setRemediationResult(null);
          setRemediationInput("");
        }, 3000);
      }
    } catch (err) {
      console.error("Remediation check failed:", err);
    } finally {
      setRemediationGrading(false);
    }
  }

  function handleNext() {
    if (currentIndex < quizItems.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setShortAnswerInput("");
      setSubmitted(false);
      setGradeResult(null);
      setRemediation(null);
      setRemediationResult(null);
      setRemediationInput("");
    } else {
      setQuizFinished(true);
    }
  }

  function handleRestart() {
    setCurrentIndex(0);
    setSelectedOption(null);
    setShortAnswerInput("");
    setSubmitted(false);
    setScore(0);
    setQuizFinished(false);
    setGradeResult(null);
    setRemediation(null);
    setRemediationResult(null);
    setRemediationInput("");
  }

  if (quizFinished) {
    const pct = Math.round((score / quizItems.length) * 100);
    return (
      <GlassCard className="mx-auto max-w-xl p-8 sm:p-12 text-center" interactive>
        <span className="text-5xl">{pct >= 70 ? "🏆" : "🌱"}</span>
        <h2 className="display mt-4 text-3xl font-bold">Quiz Completed!</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          You scored <b className="text-white">{score}</b> out of <b className="text-white">{quizItems.length}</b> ({pct}%)
        </p>

        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={handleRestart}
            className="rounded-full bg-[var(--color-accent)] px-6 py-2.5 font-display text-sm font-semibold shadow-lg shadow-purple-500/30 transition-transform hover:scale-[1.02] active:scale-[0.97]"
          >
            🔄 Retake Quiz
          </button>
          <button
            onClick={onReviewFlashcards}
            className="glass glass-hover rounded-full px-6 py-2.5 font-display text-sm font-semibold text-white"
          >
            🃏 Practice Flashcards →
          </button>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress */}
      <div className="mb-4 flex items-center justify-between text-xs text-[var(--text-secondary)]">
        <span>
          Question <b className="text-white">{currentIndex + 1}</b> of {quizItems.length}
        </span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 capitalize text-[var(--aurora-2)]">
          {currentItem.qtype} · Difficulty {currentItem.difficulty}/5
        </span>
      </div>

      <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-2)] transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / quizItems.length) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          <GlassCard className="p-6 sm:p-8" interactive>
            <h2 className="font-display text-lg font-bold text-white sm:text-xl">
              {currentItem.question}
            </h2>

            {/* MCQ Options */}
            {isMcq && (
              <div className="mt-6 space-y-3">
                {currentItem.options!.map((opt, idx) => {
                  const isSelected = selectedOption === opt;
                  const isAnswer = submitted && gradeResult
                    ? opt.trim().toUpperCase().startsWith(currentItem.answer.trim().toUpperCase())
                    : false;

                  let stateClass = "glass glass-hover opacity-85 hover:opacity-100";
                  if (submitted && gradeResult) {
                    if (isAnswer) {
                      stateClass = "border border-[var(--color-mastery)] bg-[rgba(52,211,153,0.2)] text-white shadow-lg shadow-emerald-500/20";
                    } else if (isSelected && !isAnswer) {
                      stateClass = "border border-[var(--color-forget)] bg-[rgba(251,113,133,0.2)] text-white shadow-lg shadow-rose-500/20";
                    } else {
                      stateClass = "opacity-40";
                    }
                  } else if (isSelected) {
                    stateClass = "border border-[var(--color-accent)] bg-[rgba(139,92,246,0.2)] shadow-md shadow-purple-500/20";
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={submitted || grading}
                      onClick={() => setSelectedOption(opt)}
                      className={`flex w-full items-center p-4 text-left rounded-2xl transition-all ${stateClass}`}
                    >
                      <span className="font-body text-sm">{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Short Answer / Explain Input */}
            {!isMcq && (
              <div className="mt-6">
                <textarea
                  value={shortAnswerInput}
                  onChange={(e) => setShortAnswerInput(e.target.value)}
                  disabled={submitted || grading}
                  rows={4}
                  placeholder="Type your explanation here in your own words…"
                  className="glass w-full rounded-2xl p-4 text-sm outline-none placeholder:text-white/30 focus:border focus:border-[var(--color-accent)]"
                />
              </div>
            )}

            {/* Grading in progress */}
            {grading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-6 flex items-center justify-center gap-3 rounded-2xl bg-white/5 border border-white/10 p-4"
              >
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
                <span className="text-sm text-[var(--text-secondary)]">Grading your answer…</span>
              </motion.div>
            )}

            {/* Grading Result Feedback */}
            {submitted && gradeResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-6 rounded-2xl p-4 text-sm ${
                  gradeResult.verdict === "correct"
                    ? "bg-[rgba(52,211,153,0.12)] border border-[var(--color-mastery)] text-emerald-300"
                    : gradeResult.verdict === "partial"
                      ? "bg-[rgba(251,191,36,0.12)] border border-[var(--color-learning)] text-amber-300"
                      : "bg-[rgba(251,113,133,0.12)] border border-[var(--color-forget)] text-rose-300"
                }`}
              >
                <p className="font-semibold">
                  {gradeResult.verdict === "correct"
                    ? "✨ Correct!"
                    : gradeResult.verdict === "partial"
                      ? "🔶 Partially correct"
                      : "❌ Misconception detected"}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-[var(--text-secondary)]">
                  {gradeResult.feedbackMd}
                </p>
                {gradeResult.misconception && (
                  <p className="mt-2 text-[11px] italic text-[var(--text-secondary)] opacity-70">
                    Misconception type: {gradeResult.misconception.type}
                  </p>
                )}
              </motion.div>
            )}

            {/* Remediation Coach Panel (Strategy Ladder) */}
            {submitted && remediation && !remediation.isComplete && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 rounded-2xl border border-amber-400/30 bg-[rgba(251,191,36,0.06)] p-5"
              >
                {/* Header */}
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                    <span>🩺</span> Remediation Coach — Step {remediation.step}/{remediation.totalSteps}
                  </span>
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] capitalize text-amber-200">
                    Strategy: {remediation.strategy?.replace("_", " ")}
                  </span>
                </div>

                {/* Strategy Ladder Visual Progress */}
                <div className="mb-4 flex gap-1.5">
                  {["analogy", "visual", "steps", "simpler", "story", "different_interest"].map((s) => {
                    const isCurrent = s === remediation.strategy;
                    const isTried = remediation.triedStrategies?.includes(s);
                    return (
                      <div
                        key={s}
                        className={`h-1.5 flex-1 rounded-full transition-all ${
                          isCurrent
                            ? "bg-amber-400 shadow-sm shadow-amber-400/50"
                            : isTried
                              ? "bg-rose-400/60"
                              : "bg-white/10"
                        }`}
                        title={s}
                      />
                    );
                  })}
                </div>

                {/* Empathetic Diagnosis */}
                {remediation.diagnosisMd && (
                  <p className="mb-3 text-sm italic text-amber-200/90">
                    {remediation.diagnosisMd}
                  </p>
                )}

                {/* Re-teach Card */}
                <div className="mb-4 rounded-xl bg-white/5 p-4 border border-white/10">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-primary)]">
                    {remediation.reteachMd}
                  </p>
                </div>

                {/* Micro-check Question */}
                <div className="border-t border-white/10 pt-4">
                  <p className="mb-2 text-sm font-semibold text-white">
                    🎯 Quick Check: {remediation.microCheckQuestion}
                  </p>
                  <textarea
                    value={remediationInput}
                    onChange={(e) => setRemediationInput(e.target.value)}
                    disabled={remediationGrading || !!remediationResult?.passed}
                    rows={2}
                    placeholder="Type your explanation here…"
                    className="glass w-full rounded-xl p-3 text-sm outline-none placeholder:text-white/30 focus:border focus:border-amber-400/50"
                  />

                  {/* Micro-check Grading Result */}
                  {remediationResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`mt-3 rounded-xl p-3 text-sm ${
                        remediationResult.rescued
                          ? "border border-[var(--color-mastery)] bg-[rgba(52,211,153,0.15)] text-emerald-300"
                          : remediationResult.parked
                            ? "border border-white/10 bg-white/5 text-[var(--text-secondary)]"
                            : "border border-amber-400/30 bg-[rgba(251,191,36,0.1)] text-amber-300"
                      }`}
                    >
                      {remediationResult.rescued ? (
                        <>
                          <p className="font-semibold">{remediationResult.celebrationMd || "🎉 Concept Rescued!"}</p>
                          <p className="mt-1 text-xs text-emerald-200/80">{remediationResult.feedbackMd}</p>
                        </>
                      ) : remediationResult.parked ? (
                        <>
                          <p className="font-semibold">🌙 Concept Parked for Now</p>
                          <p className="mt-1 text-xs text-[var(--text-secondary)]">{remediationResult.messageMd || remediationResult.feedbackMd}</p>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold">🔄 Not quite yet — trying next strategy in 3s…</p>
                          <p className="mt-1 text-xs text-amber-200/80">{remediationResult.feedbackMd}</p>
                        </>
                      )}
                    </motion.div>
                  )}

                  {/* Submit Micro-check Button */}
                  {!remediationResult?.passed && (
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={handleRemediationSubmit}
                        disabled={!remediationInput.trim() || remediationGrading}
                        className="rounded-full bg-amber-500 px-5 py-2 font-display text-xs font-semibold text-black shadow-lg shadow-amber-500/30 transition-transform hover:scale-[1.02] active:scale-[0.97] disabled:opacity-50"
                      >
                        {remediationGrading ? "Evaluating…" : "Check Answer →"}
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Actions */}
            <div className="mt-8 flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              {!submitted && !grading ? (
                <button
                  onClick={handleSubmitAnswer}
                  disabled={isMcq ? !selectedOption : !shortAnswerInput.trim()}
                  className="rounded-full bg-[var(--color-accent)] px-7 py-2.5 font-display text-sm font-semibold shadow-lg shadow-purple-500/30 transition-transform hover:scale-[1.02] active:scale-[0.97] disabled:opacity-50"
                >
                  Submit Answer →
                </button>
              ) : submitted ? (
                <button
                  onClick={handleNext}
                  className="rounded-full bg-[var(--color-mastery)] px-7 py-2.5 font-display text-sm font-semibold text-black shadow-lg shadow-emerald-500/30 transition-transform hover:scale-[1.02] active:scale-[0.97]"
                >
                  {currentIndex < quizItems.length - 1 ? "Next Question →" : "Finish Quiz →"}
                </button>
              ) : null}
            </div>
          </GlassCard>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* =========================================================================
   TAB 3: Flashcards Tab (3D Flip + Interest-Personalized Hints)
   ========================================================================= */

function FlashcardsTab({ flashcards }: { flashcards: FlashcardDto[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [masteredCount, setMasteredCount] = useState(0);

  if (!flashcards.length) {
    return (
      <GlassCard className="p-8 text-center">
        <span className="text-3xl">🃏</span>
        <h3 className="display mt-3 text-xl font-semibold">Generating Flashcards</h3>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Flashcards with interest-based memory hints are being prepared.
        </p>
      </GlassCard>
    );
  }

  const currentCard = flashcards[currentIndex];

  function handleFlip() {
    setFlipped(!flipped);
  }

  function handleNext() {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex((i) => i + 1);
      setFlipped(false);
      setShowHint(false);
    }
  }

  function handlePrev() {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setFlipped(false);
      setShowHint(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      {/* Top status */}
      <div className="mb-4 flex items-center justify-between text-xs text-[var(--text-secondary)]">
        <span>
          Card <b className="text-white">{currentIndex + 1}</b> of {flashcards.length}
        </span>
        <span className="text-[var(--color-mastery)] font-medium">
          ⭐ {masteredCount} Mastered
        </span>
      </div>

      {/* 3D Flip Card Container */}
      <div className="relative min-h-[320px] w-full cursor-pointer perspective-1000" onClick={handleFlip}>
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
          className="relative h-full min-h-[320px] w-full [transform-style:preserve-3d]"
        >
          {/* Front Face */}
          <GlassCard
            className={`absolute inset-0 flex flex-col justify-between p-8 text-center [backface-visibility:hidden] ${
              !flipped ? "pointer-events-auto" : "pointer-events-none"
            }`}
            interactive
          >
            <span className="text-xs uppercase tracking-widest text-[var(--aurora-2)]">Question / Prompt</span>
            <p className="font-display text-xl font-bold leading-relaxed text-white sm:text-2xl">
              {currentCard.front}
            </p>
            <p className="text-xs text-[var(--text-secondary)]">Click to flip card ↷</p>
          </GlassCard>

          {/* Back Face */}
          <GlassCard
            className={`absolute inset-0 flex flex-col justify-between p-8 text-center [backface-visibility:hidden] [transform:rotateY(180deg)] ${
              flipped ? "pointer-events-auto" : "pointer-events-none"
            }`}
            interactive
          >
            <span className="text-xs uppercase tracking-widest text-[var(--color-mastery)]">Answer</span>
            <p className="font-body text-base leading-relaxed text-white">
              {currentCard.back}
            </p>
            <p className="text-xs text-[var(--text-secondary)]">Click to flip back ↶</p>
          </GlassCard>
        </motion.div>
      </div>

      {/* Memory Hook Hint */}
      {currentCard.hint && (
        <div className="mt-4">
          {!showHint ? (
            <button
              onClick={() => setShowHint(true)}
              className="mx-auto block text-xs text-[var(--aurora-3)] hover:underline"
            >
              💡 Need a memory hook hint?
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl border border-[var(--aurora-3)]/30 p-3.5 text-center text-xs text-amber-200"
            >
              <span className="font-semibold">💡 Memory Bridge: </span>
              {currentCard.hint}
            </motion.div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex items-center justify-between gap-4">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="glass glass-hover rounded-full px-5 py-2 text-xs font-semibold disabled:opacity-30"
        >
          ← Previous
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setMasteredCount((c) => c + 1);
              handleNext();
            }}
            className="rounded-full bg-[rgba(52,211,153,0.18)] border border-[var(--color-mastery)] px-4 py-2 text-xs font-semibold text-emerald-300 hover:bg-[rgba(52,211,153,0.28)]"
          >
            👍 Mastered
          </button>
          <button
            onClick={handleNext}
            className="rounded-full bg-[rgba(251,191,36,0.18)] border border-[var(--color-learning)] px-4 py-2 text-xs font-semibold text-amber-300 hover:bg-[rgba(251,191,36,0.28)]"
          >
            🔄 Still Learning
          </button>
        </div>

        <button
          onClick={handleNext}
          disabled={currentIndex === flashcards.length - 1}
          className="glass glass-hover rounded-full px-5 py-2 text-xs font-semibold disabled:opacity-30"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
   TAB 4: Cheat Sheet Tab (Printable Condensed Reference)
   ========================================================================= */

function CheatSheetTab({ cheatSheetMd, subject }: { cheatSheetMd: string; subject: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(cheatSheetMd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Control bar */}
      <GlassCard className="flex items-center justify-between p-4">
        <span className="text-xs text-[var(--text-secondary)]">
          One-page condensed reference for <b className="text-white">{subject}</b>
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="glass glass-hover rounded-full px-4 py-1.5 text-xs font-semibold text-white"
          >
            {copied ? "✓ Copied!" : "📋 Copy Markdown"}
          </button>
          <button
            onClick={handlePrint}
            className="rounded-full bg-[var(--color-accent)] px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-purple-500/25"
          >
            🖨️ Print / Save PDF
          </button>
        </div>
      </GlassCard>

      {/* Sheet Content */}
      <GlassCard className="p-8 sm:p-10 font-body" interactive>
        <div className="border-b border-white/10 pb-4">
          <h2 className="display text-2xl font-bold text-white">{subject} — Quick Reference</h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Essential definitions, key formulas, and high-frequency exam concepts.
          </p>
        </div>
        <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-primary)]">
          {cheatSheetMd}
        </div>
      </GlassCard>
    </div>
  );
}

/* =========================================================================
   TAB 6: Progress Analytics (Mastery Overview + Strategy Stats)
   ========================================================================= */

const PROGRESS_COLORS = {
  mastered: { bg: "rgba(52,211,153,0.15)", border: "#34d399", text: "#34d399" },
  learning: { bg: "rgba(251,191,36,0.15)", border: "#fbbf24", text: "#fbbf24" },
  weak: { bg: "rgba(251,113,133,0.15)", border: "#fb7185", text: "#fb7185" },
  new: { bg: "rgba(139,92,246,0.15)", border: "#8b5cf6", text: "#8b5cf6" },
};

function ProgressTab({ materialId }: { materialId: string | undefined }) {
  const [progress, setProgress] = useState<ProgressDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!materialId) {
      setLoading(false);
      return;
    }
    getProgress(materialId)
      .then(setProgress)
      .catch((err) => console.error("Failed to load progress:", err))
      .finally(() => setLoading(false));
  }, [materialId]);

  if (loading) {
    return (
      <GlassCard className="flex items-center justify-center p-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
        <span className="ml-3 text-sm text-[var(--text-secondary)]">
          Loading analytics…
        </span>
      </GlassCard>
    );
  }

  if (!progress || progress.overallStats.totalConcepts === 0) {
    return (
      <GlassCard className="p-8 text-center">
        <span className="text-3xl">📊</span>
        <h3 className="display mt-3 text-xl font-semibold">
          No Progress Data Yet
        </h3>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Complete some quizzes to see your mastery analytics here.
        </p>
      </GlassCard>
    );
  }

  const { overallStats, conceptProgress, strategyStats, weakestConcepts } =
    progress;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ── Overall Mastery Summary ── */}
      <GlassCard className="p-6" interactive>
        <h3 className="font-display text-lg font-bold text-white">
          📊 Mastery Overview
        </h3>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: "Total", value: overallStats.totalConcepts, color: "#8b5cf6" },
            { label: "Mastered", value: overallStats.mastered, color: "#34d399" },
            { label: "Learning", value: overallStats.learning, color: "#fbbf24" },
            { label: "Weak", value: overallStats.weak, color: "#fb7185" },
            { label: "New", value: overallStats.new, color: "#a78bfa" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-white/5 p-3 text-center">
              <p className="text-2xl font-bold" style={{ color: s.color }}>
                {s.value}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Stacked Mastery Progress Bar */}
        {overallStats.totalConcepts > 0 && (
          <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full bg-[#34d399] transition-all"
              style={{
                width: `${(overallStats.mastered / overallStats.totalConcepts) * 100}%`,
              }}
              title={`${overallStats.mastered} mastered`}
            />
            <div
              className="h-full bg-[#fbbf24] transition-all"
              style={{
                width: `${(overallStats.learning / overallStats.totalConcepts) * 100}%`,
              }}
              title={`${overallStats.learning} learning`}
            />
            <div
              className="h-full bg-[#fb7185] transition-all"
              style={{
                width: `${(overallStats.weak / overallStats.totalConcepts) * 100}%`,
              }}
              title={`${overallStats.weak} weak`}
            />
            <div
              className="h-full bg-[#a78bfa] transition-all"
              style={{
                width: `${(overallStats.new / overallStats.totalConcepts) * 100}%`,
              }}
              title={`${overallStats.new} new`}
            />
          </div>
        )}

        {/* Attempt Stats Row */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-[var(--text-secondary)]">
          <span>
            Total attempts:{" "}
            <b className="text-white">{overallStats.totalAttempts}</b>
          </span>
          <span>
            Correct:{" "}
            <b className="text-emerald-400">{overallStats.totalCorrect}</b>
          </span>
          <span>
            Accuracy:{" "}
            <b className="text-white">
              {overallStats.totalAttempts > 0
                ? Math.round(
                    (overallStats.totalCorrect / overallStats.totalAttempts) *
                      100,
                  )
                : 0}
              %
            </b>
          </span>
        </div>
      </GlassCard>

      {/* ── Per-Concept Mastery Bars ── */}
      <GlassCard className="p-6" interactive>
        <h3 className="font-display text-lg font-bold text-white">
          🎯 Concept Mastery
        </h3>
        <div className="mt-4 space-y-3">
          {conceptProgress.map((c) => {
            const colors =
              PROGRESS_COLORS[c.status] || PROGRESS_COLORS.new;
            /* Normalize ease factor to a 0-100% bar: EF range is 1.3–3.0 */
            const barWidth = Math.min(
              100,
              Math.max(5, ((c.easeFactor - 1.3) / 1.7) * 100),
            );
            return (
              <div key={c.conceptId} className="flex items-center gap-3">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: colors.border }}
                />
                <span className="w-36 truncate text-sm text-white sm:w-44">
                  {c.name}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${barWidth}%`,
                      background: colors.border,
                    }}
                  />
                </div>
                <span
                  className="w-16 text-right text-[11px] capitalize"
                  style={{ color: colors.text }}
                >
                  {c.status}
                </span>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* ── Strategy Effectiveness ── */}
      {strategyStats.length > 0 && (
        <GlassCard className="p-6" interactive>
          <h3 className="font-display text-lg font-bold text-white">
            🧠 Strategy Effectiveness
          </h3>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            How effective each remediation strategy has been for you.
          </p>
          <div className="mt-4 space-y-3">
            {strategyStats.map((s) => (
              <div key={s.strategy} className="flex items-center gap-3">
                <span className="w-28 truncate text-sm capitalize text-white sm:w-36">
                  {s.strategy.replace("_", " ")}
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                    style={{ width: `${s.rate * 100}%` }}
                  />
                </div>
                <span className="w-24 text-right text-xs text-[var(--text-secondary)]">
                  {s.successes}/{s.total} ({Math.round(s.rate * 100)}%)
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* ── Weakest Concepts (Needs Attention) ── */}
      {weakestConcepts.length > 0 && (
        <GlassCard className="p-6" interactive>
          <h3 className="font-display text-lg font-bold text-white">
            ⚠️ Needs Attention
          </h3>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Concepts you&apos;ve struggled with the most — focus review here.
          </p>
          <div className="mt-4 space-y-2">
            {weakestConcepts.map((c) => (
              <div
                key={c.conceptId}
                className="flex items-center justify-between rounded-xl border border-rose-500/15 bg-[rgba(251,113,133,0.06)] p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                  <span className="text-sm text-white">{c.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-rose-300">
                    {c.failCount} fails
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]">
                    EF: {c.easeFactor.toFixed(1)}
                  </span>
                  {c.dueDate && (
                    <span className="text-xs text-amber-300">
                      Due: {c.dueDate}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}

