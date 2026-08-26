"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  BookOpen,
  Target,
  Layers,
  FileText,
  Brain,
  BarChart3,
  Volume2,
  Pause,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Printer,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  Zap,
} from "lucide-react";
import { LiquidGlassCard } from "@/components/glass/LiquidGlassCard";
import { LiquidGlassButton } from "@/components/glass/LiquidGlassButton";
import { LiquidGlassBadge } from "@/components/glass/LiquidGlassBadge";
import type {
  ConceptNodeDto,
  GeneratedAssetsDto,
  QuizItemDto,
  FlashcardDto,
  GradeResultDto,
  RemediationStepDto,
  RemediationCheckResultDto,
  ProgressDto,
} from "@/lib/agent-client";
import { submitAnswer, checkRemediation, getProgress } from "@/lib/agent-client";

/* SSR-safe dynamic import for React Flow */
const MindMapView = dynamic(() => import("@/components/mindmap/MindMapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[560px] items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
      <span className="ml-3 text-sm text-slate-500">Loading concept graph…</span>
    </div>
  ),
});

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

const TABS = [
  { id: "overview" as TabId, label: "Overview", icon: BookOpen },
  { id: "quiz" as TabId, label: "Adaptive Quiz", icon: Target },
  { id: "flashcards" as TabId, label: "3D Flashcards", icon: Layers },
  { id: "cheatsheet" as TabId, label: "Cheat Sheet", icon: FileText },
  { id: "mindmap" as TabId, label: "Mind Map", icon: Brain },
  { id: "progress" as TabId, label: "Analytics", icon: BarChart3 },
];

export default function StudyPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = (Array.isArray(params.id) ? params.id[0] : params.id) || "";
  const [tab, setTab] = useState<TabId>("overview");
  const [data, setData] = useState<StudyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    const raw = sessionStorage.getItem(`study:${sessionId}`) || sessionStorage.getItem(`ingest:${sessionId}`);
    if (raw) {
      try {
        setData(JSON.parse(raw) as StudyData);
      } catch {
        /* ignore */
      }
    }
    setLoading(false);
  }, [sessionId]);

  if (loading) {
    return (
      <main className="relative flex min-h-[80vh] flex-col items-center justify-center text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
        <p className="mt-4 font-display text-sm text-slate-500">Loading your study system…</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="relative min-h-[80vh] flex flex-col items-center justify-center px-6 text-center">
        <LiquidGlassCard depth="medium" className="max-w-md p-8 border-slate-200 bg-white shadow-md">
          <div className="flex justify-center mb-3">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>
          <h2 className="display text-2xl font-bold text-slate-900">Study Hub Not Found</h2>
          <p className="mt-2 text-xs text-slate-500">
            No active session data was found in local storage for this ID.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/upload">
              <LiquidGlassButton size="sm" icon={<Zap className="h-3.5 w-3.5" />}>
                Launch Studio
              </LiquidGlassButton>
            </Link>
          </div>
        </LiquidGlassCard>
      </main>
    );
  }

  const { generatedAssets, conceptTree, subject = "General", level = "intermediate" } = data;
  const quizItems = generatedAssets.quizItems ?? [];
  const flashcards = generatedAssets.flashcards ?? [];

  return (
    <main className="relative min-h-screen px-4 pb-24 sm:px-8">
      <div className="mx-auto max-w-5xl pt-2 sm:pt-6">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <LiquidGlassBadge variant="indigo" size="sm">{subject}</LiquidGlassBadge>
              <LiquidGlassBadge variant="neutral" size="sm" className="capitalize">{level} Level</LiquidGlassBadge>
            </div>
            <h1 className="display text-2xl sm:text-3xl font-extrabold text-slate-900">
              {conceptTree[0]?.name ? `${conceptTree[0].name} Hub` : "Personalized Study Hub"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Personalized explainer, active recall testing, and concept map.
            </p>
          </div>

          <Link href="/upload">
            <LiquidGlassButton variant="secondary" size="sm" icon={<RotateCw className="h-3.5 w-3.5" />}>
              New Material
            </LiquidGlassButton>
          </Link>
        </div>

        {/* 6-Tab Navigation Dock */}
        <div className="mt-5 flex flex-wrap gap-1.5">
          {TABS.map((t) => {
            const Icon = t.icon;
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
                className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white/80 text-slate-600 hover:text-slate-900 border border-slate-200/90 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{t.label}</span>
                {countBadge !== null && countBadge > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
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
        <div className="mt-6">
          {tab === "overview" && (
            <OverviewTab
              explainerMd={generatedAssets.explainerMd || data.cleanedText}
              conceptTree={conceptTree}
              onNavigateToQuiz={() => setTab("quiz")}
            />
          )}

          {tab === "quiz" && (
            <QuizTab
              sessionId={sessionId}
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSpeechSupported(false);
    }
  }, []);

  function toggleAudio() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      window.speechSynthesis.cancel();
      const textToRead = explainerMd.replace(/[#*`_\[\]]/g, "").slice(0, 1500);
      const utter = new SpeechSynthesisUtterance(textToRead);
      utter.rate = 1.0;
      utter.onend = () => setIsPlaying(false);
      utter.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(utter);
      setIsPlaying(true);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Main Explainer Prose */}
      <div className="lg:col-span-2 space-y-5">
        <LiquidGlassCard depth="medium" className="p-7 sm:p-9 border-slate-200/90 bg-white/95 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-indigo-600" />
              <h2 className="font-display text-lg font-bold text-slate-900">Personalized Explainer</h2>
            </div>

            {speechSupported && (
              <button
                onClick={toggleAudio}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition-all ${
                  isPlaying
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5 text-white" /> : <Volume2 className="h-3.5 w-3.5 text-slate-600" />}
                <span>{isPlaying ? "Pause Lesson" : "Listen (Spoken)"}</span>
              </button>
            )}
          </div>

          <div className="mt-5 whitespace-pre-wrap text-xs sm:text-sm leading-relaxed text-slate-700 font-normal">
            {explainerMd}
          </div>

          <div className="mt-8 pt-5 border-t border-slate-100 flex justify-between items-center">
            <span className="text-xs text-slate-500">Ready to test retention?</span>
            <LiquidGlassButton onClick={onNavigateToQuiz} size="sm" icon={<Target className="h-3.5 w-3.5" />}>
              Start Quiz →
            </LiquidGlassButton>
          </div>
        </LiquidGlassCard>
      </div>

      {/* Sidebar: Knowledge Tree Roots */}
      <div className="space-y-4">
        <LiquidGlassCard depth="low" className="p-5 border-slate-200/90 bg-white/95">
          <h3 className="font-display text-sm font-bold text-slate-900 mb-0.5 flex items-center gap-2">
            <Brain className="h-4 w-4 text-indigo-600" />
            <span>Extracted Concept Roots</span>
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            Core concepts found in this material
          </p>

          <div className="space-y-2">
            {conceptTree.map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900 truncate max-w-[160px]">{c.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200 font-mono">
                    Diff {c.difficulty}/5
                  </span>
                </div>
                {c.keyFacts && c.keyFacts.length > 0 && (
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{c.keyFacts[0]}</p>
                )}
              </div>
            ))}
          </div>
        </LiquidGlassCard>
      </div>
    </div>
  );
}

/* =========================================================================
   TAB 2: Quiz Tab (Adaptive Runner + Remediation Coach Ladder)
   ========================================================================= */

function QuizTab({
  sessionId,
  quizItems,
  conceptTree,
  onReviewFlashcards,
}: {
  sessionId: string;
  quizItems: QuizItemDto[];
  conceptTree: ConceptNodeDto[];
  onReviewFlashcards: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [shortAnswer, setShortAnswer] = useState("");
  const [grading, setGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState<GradeResultDto | null>(null);
  const [remediationStep, setRemediationStep] = useState<RemediationStepDto | null>(null);
  const [microCheckAnswer, setMicroCheckAnswer] = useState("");
  const [remediationChecking, setRemediationChecking] = useState(false);
  const [remediationResult, setRemediationResult] = useState<RemediationCheckResultDto | null>(null);
  const [triedStrategies, setTriedStrategies] = useState<string[]>([]);
  const [score, setScore] = useState(0);

  const currentQ = quizItems[index];

  if (quizItems.length === 0) {
    return (
      <LiquidGlassCard depth="medium" className="p-8 text-center max-w-lg mx-auto bg-white">
        <Target className="h-8 w-8 text-slate-400 mx-auto mb-3" />
        <h3 className="font-display text-lg font-bold text-slate-900">Generating Quiz Questions…</h3>
        <p className="text-xs text-slate-500 mt-1">Quiz items are being forged for this study set.</p>
      </LiquidGlassCard>
    );
  }

  async function handleGrade() {
    if (!currentQ || grading) return;
    setGrading(true);
    const responseText = currentQ.qtype === "mcq" ? selectedOption || "" : shortAnswer;

    try {
      const res = await submitAnswer(sessionId, currentQ.id || currentQ.conceptId, responseText);
      setGradeResult(res.grade);
      if (res.grade.verdict === "correct") {
        setScore((s) => s + 1);
      }
      if (res.remediation) {
        setRemediationStep(res.remediation);
        setTriedStrategies(res.remediation.strategy ? [res.remediation.strategy] : []);
      }
    } catch {
      const isCorrect = currentQ.qtype === "mcq" && selectedOption?.trim().startsWith(currentQ.answer.substring(0, 2));
      setGradeResult({
        verdict: isCorrect ? "correct" : "wrong",
        score: isCorrect ? 100 : 0,
        misconception: isCorrect ? null : { type: "recall_gap", evidenceQuote: responseText },
        feedbackMd: isCorrect ? "Correct! Well done." : `Expected: ${currentQ.answer}`,
      });
      if (isCorrect) setScore((s) => s + 1);
    } finally {
      setGrading(false);
    }
  }

  async function handleRemediationCheck() {
    if (!remediationStep || !microCheckAnswer.trim()) return;
    setRemediationChecking(true);
    const strategy = remediationStep.strategy || "analogy";
    const microCheckQ = remediationStep.microCheckQuestion || "";
    try {
      const res = await checkRemediation(
        sessionId,
        currentQ.conceptId,
        currentQ.id || "",
        strategy,
        microCheckQ,
        microCheckAnswer,
        triedStrategies,
      );
      setRemediationResult(res);
      if (res.passed) {
        setScore((s) => s + 1);
      } else if (res.nextStep) {
        setRemediationStep(res.nextStep);
        if (res.nextStep.strategy) {
          setTriedStrategies((p) => [...p, res.nextStep!.strategy!]);
        }
        setMicroCheckAnswer("");
      }
    } catch {
      setRemediationResult({
        passed: true,
        rescued: true,
        feedbackMd: "Concept rescued! Keep pushing forward.",
      });
    } finally {
      setRemediationChecking(false);
    }
  }

  function handleNextQuestion() {
    setSelectedOption(null);
    setShortAnswer("");
    setGradeResult(null);
    setRemediationStep(null);
    setRemediationResult(null);
    setMicroCheckAnswer("");
    setTriedStrategies([]);
    if (index < quizItems.length - 1) {
      setIndex((i) => i + 1);
    } else {
      setIndex(0);
    }
  }

  const isMcq = currentQ.qtype === "mcq";

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Quiz Progress Top Bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>Question {index + 1} of {quizItems.length}</span>
        <span className="text-emerald-700 font-semibold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          Score: {score}/{index + (gradeResult ? 1 : 0)}
        </span>
      </div>

      {/* Main Question Card */}
      <LiquidGlassCard depth="medium" className="p-7 sm:p-9 border-slate-200/90 bg-white/95 shadow-sm">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <LiquidGlassBadge variant="indigo" size="sm">
            {isMcq ? "Multiple Choice" : "Short Answer"}
          </LiquidGlassBadge>
          <LiquidGlassBadge variant="neutral" size="sm">
            Difficulty {currentQ.difficulty}/5
          </LiquidGlassBadge>
        </div>

        <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 mt-5 leading-snug">
          {currentQ.question}
        </h2>

        {/* Options */}
        {isMcq && currentQ.options && (
          <div className="mt-5 space-y-2.5">
            {currentQ.options.map((opt) => {
              const isSelected = selectedOption === opt;
              const isCorrectAnswer = opt.trim().startsWith(currentQ.answer.substring(0, 2));

              let borderStyle = "border-slate-200 bg-slate-50 hover:bg-slate-100/80 text-slate-700";
              if (gradeResult) {
                if (isCorrectAnswer) {
                  borderStyle = "border-emerald-400 bg-emerald-50 text-emerald-900 font-semibold";
                } else if (isSelected && !isCorrectAnswer) {
                  borderStyle = "border-rose-300 bg-rose-50 text-rose-900";
                } else {
                  borderStyle = "opacity-40 border-slate-200";
                }
              } else if (isSelected) {
                borderStyle = "border-slate-900 bg-slate-100 text-slate-900 font-semibold";
              }

              return (
                <button
                  key={opt}
                  disabled={Boolean(gradeResult)}
                  onClick={() => setSelectedOption(opt)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all text-xs sm:text-sm ${borderStyle}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {!isMcq && (
          <div className="mt-5">
            <textarea
              value={shortAnswer}
              onChange={(e) => setShortAnswer(e.target.value)}
              disabled={Boolean(gradeResult)}
              rows={4}
              placeholder="Type your explanation in your own words…"
              className="w-full rounded-xl p-3.5 text-xs sm:text-sm text-slate-800 outline-none border border-slate-200 bg-slate-50/70 focus:border-slate-400 focus:bg-white"
            />
          </div>
        )}

        {/* Grade Feedback Box */}
        {gradeResult && !remediationStep && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-5 p-4 rounded-xl border ${
              gradeResult.verdict === "correct"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-rose-50 border-rose-200 text-rose-900"
            }`}
          >
            <div className="flex items-center gap-2 font-display font-bold text-xs sm:text-sm">
              {gradeResult.verdict === "correct" ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Correct! Understanding Verified</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  <span>Misconception Detected</span>
                </>
              )}
            </div>
            <p className="text-xs mt-1.5 leading-relaxed">{gradeResult.feedbackMd}</p>
          </motion.div>
        )}

        {/* Remediation Ladder Panel */}
        {remediationStep && !remediationResult?.passed && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-3"
          >
            <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
              <div className="flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-amber-600" />
                <span className="font-display text-xs sm:text-sm font-bold text-amber-900">
                  Remediation Coach · Step {remediationStep.step}/5 ({remediationStep.strategy ? remediationStep.strategy.replace("_", " ") : "rescue"})
                </span>
              </div>
              <span className="text-[10px] text-amber-700 font-mono">Rescue Loop</span>
            </div>

            <div className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
              {remediationStep.reteachMd || remediationStep.diagnosisMd || remediationStep.messageMd}
            </div>

            {remediationStep.microCheckQuestion && (
              <div className="pt-2 border-t border-amber-200/80">
                <label className="block text-xs font-semibold text-slate-900 mb-1.5">
                  Micro-Check: {remediationStep.microCheckQuestion}
                </label>
                <div className="flex gap-2">
                  <input
                    value={microCheckAnswer}
                    onChange={(e) => setMicroCheckAnswer(e.target.value)}
                    placeholder="Answer to rescue concept…"
                    className="flex-1 rounded-xl px-3.5 py-1.5 text-xs text-slate-900 outline-none border border-amber-300 bg-white"
                  />
                  <LiquidGlassButton
                    onClick={handleRemediationCheck}
                    loading={remediationChecking}
                    size="sm"
                    variant="primary"
                  >
                    Verify Rescue
                  </LiquidGlassButton>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Rescue Celebration */}
        {remediationResult?.passed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900"
          >
            <div className="flex items-center gap-2 font-display font-bold text-xs sm:text-sm">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <span>Concept Rescued! Strategy Updated</span>
            </div>
            <p className="text-xs mt-1 text-emerald-800">{remediationResult.feedbackMd}</p>
          </motion.div>
        )}

        {/* Action Controls */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {gradeResult ? "Answer graded" : "Select an answer to check"}
          </span>

          {!gradeResult ? (
            <LiquidGlassButton
              onClick={handleGrade}
              loading={grading}
              disabled={isMcq ? !selectedOption : !shortAnswer.trim()}
              size="md"
              icon={<CheckCircle2 className="h-4 w-4" />}
            >
              Submit Answer
            </LiquidGlassButton>
          ) : (
            <LiquidGlassButton
              onClick={handleNextQuestion}
              variant="primary"
              size="md"
              icon={<ArrowRight className="h-4 w-4" />}
            >
              Next Question →
            </LiquidGlassButton>
          )}
        </div>
      </LiquidGlassCard>
    </div>
  );
}

/* =========================================================================
   TAB 3: Flashcards Tab (3D Flip Physics + Interest Hooks)
   ========================================================================= */

function FlashcardsTab({ flashcards }: { flashcards: FlashcardDto[] }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);

  if (flashcards.length === 0) {
    return (
      <LiquidGlassCard depth="medium" className="p-8 text-center max-w-lg mx-auto bg-white">
        <Layers className="h-8 w-8 text-slate-400 mx-auto mb-3" />
        <h3 className="font-display text-lg font-bold text-slate-900">Generating Flashcards…</h3>
        <p className="text-xs text-slate-500 mt-1">Flashcard deck is being forged.</p>
      </LiquidGlassCard>
    );
  }

  const currentCard = flashcards[index];

  function handleNext() {
    setFlipped(false);
    setShowHint(false);
    if (index < flashcards.length - 1) setIndex((i) => i + 1);
    else setIndex(0);
  }

  function handlePrev() {
    setFlipped(false);
    setShowHint(false);
    if (index > 0) setIndex((i) => i - 1);
    else setIndex(flashcards.length - 1);
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex justify-between items-center text-xs text-slate-500 px-1">
        <span>Card {index + 1} of {flashcards.length}</span>
        <span className="text-slate-400">Click card to flip</span>
      </div>

      {/* 3D Flip Card Container */}
      <div className="perspective-1000 min-h-[280px]">
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ transformStyle: "preserve-3d" }}
          onClick={() => setFlipped(!flipped)}
          className="relative min-h-[280px] w-full cursor-pointer"
        >
          {/* Front Face */}
          <div
            className={`absolute inset-0 rounded-2xl p-7 flex flex-col justify-between border border-slate-200/90 bg-white shadow-md [backface-visibility:hidden] ${
              flipped ? "pointer-events-none" : ""
            }`}
          >
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
                Active Recall Prompt
              </span>
              <h3 className="font-display text-lg sm:text-xl font-bold text-slate-900 mt-3 leading-snug">
                {currentCard.front}
              </h3>
            </div>

            <div>
              {currentCard.hint && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowHint(!showHint);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium cursor-pointer"
                >
                  <Sparkles className="h-3 w-3 text-amber-600" />
                  <span>{showHint ? currentCard.hint : "Show Memory Hook Hint"}</span>
                </div>
              )}
            </div>
          </div>

          {/* Back Face */}
          <div
            className={`absolute inset-0 rounded-2xl p-7 flex flex-col justify-between border border-emerald-200 bg-emerald-50/60 shadow-md [transform:rotateY(180deg)] [backface-visibility:hidden] ${
              !flipped ? "pointer-events-none" : ""
            }`}
          >
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-700 font-bold">
                Definition & Context
              </span>
              <p className="text-sm text-slate-800 mt-3 leading-relaxed font-medium">
                {currentCard.back}
              </p>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-500 pt-3 border-t border-emerald-200/60">
              <span>SM-2 Memory Card</span>
              <span className="text-emerald-700 font-medium">Click to flip back</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between gap-3">
        <LiquidGlassButton onClick={handlePrev} variant="secondary" size="sm" icon={<ArrowLeft className="h-3.5 w-3.5" />}>
          Previous
        </LiquidGlassButton>
        <LiquidGlassButton onClick={handleNext} variant="primary" size="sm" icon={<ArrowRight className="h-3.5 w-3.5" />}>
          Next Card
        </LiquidGlassButton>
      </div>
    </div>
  );
}

/* =========================================================================
   TAB 4: Cheat Sheet Tab (Printable Condensed Guide)
   ========================================================================= */

function CheatSheetTab({ cheatSheetMd, subject }: { cheatSheetMd: string; subject: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(cheatSheetMd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <LiquidGlassCard depth="medium" className="p-7 sm:p-9 border-slate-200/90 bg-white/95 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900">{subject} Reference Sheet</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              High-yield definitions and concept summaries.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 hover:text-slate-900"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        <div className="mt-6 whitespace-pre-wrap text-xs sm:text-sm leading-relaxed text-slate-700 font-normal">
          {cheatSheetMd}
        </div>
      </LiquidGlassCard>
    </div>
  );
}

/* =========================================================================
   TAB 6: Progress Analytics (Mastery Overview + Strategy Stats)
   ========================================================================= */

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
      <div className="flex justify-center p-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
      </div>
    );
  }

  if (!progress || progress.overallStats.totalConcepts === 0) {
    return (
      <LiquidGlassCard depth="medium" className="p-8 text-center max-w-lg mx-auto bg-white">
        <BarChart3 className="h-8 w-8 text-slate-400 mx-auto mb-3" />
        <h3 className="font-display text-lg font-bold text-slate-900">No Progress Data Yet</h3>
        <p className="text-xs text-slate-500 mt-1">Complete quizzes to unlock live mastery analytics.</p>
      </LiquidGlassCard>
    );
  }

  const { overallStats, conceptProgress } = progress;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Overview Bento */}
      <LiquidGlassCard depth="low" className="p-5 border-slate-200/90 bg-white/95">
        <h3 className="font-display text-sm font-bold text-slate-900 mb-3">Mastery Distribution</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {[
            { label: "Total", value: overallStats.totalConcepts, color: "text-slate-900" },
            { label: "Mastered", value: overallStats.mastered, color: "text-emerald-700" },
            { label: "Learning", value: overallStats.learning, color: "text-amber-700" },
            { label: "Weak", value: overallStats.weak, color: "text-rose-700" },
            { label: "New", value: overallStats.new, color: "text-indigo-700" },
          ].map((s) => (
            <div key={s.label} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
              <p className={`font-display text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </LiquidGlassCard>

      {/* Concept Ease Factor Bars */}
      <LiquidGlassCard depth="medium" className="p-5 border-slate-200/90 bg-white/95">
        <h3 className="font-display text-sm font-bold text-slate-900 mb-3">Concept Ease Factors</h3>
        <div className="space-y-2.5 text-xs">
          {conceptProgress.map((c) => (
            <div key={c.conceptId} className="flex items-center gap-3">
              <span className="w-32 truncate text-slate-800 font-medium">{c.name}</span>
              <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${Math.min(100, Math.max(10, ((c.easeFactor - 1.3) / 1.7) * 100))}%` }}
                />
              </div>
              <span className="w-14 text-right font-mono text-slate-500 text-[11px]">EF {c.easeFactor.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </LiquidGlassCard>
    </div>
  );
}
