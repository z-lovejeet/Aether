"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ArrowRight,
  Filter,
} from "lucide-react";
import { LiquidGlassCard } from "@/components/glass/LiquidGlassCard";
import { LiquidGlassButton } from "@/components/glass/LiquidGlassButton";
import { LiquidGlassBadge } from "@/components/glass/LiquidGlassBadge";
import type { QuizItemDto } from "@/lib/agent-client";

const PRACTICE_BANK: (QuizItemDto & { subject: string; conceptName: string })[] = [
  {
    id: "q-1",
    conceptId: "c-1",
    subject: "Biology",
    conceptName: "Glycolysis Net Yield",
    qtype: "mcq",
    question: "What is the net gain of ATP molecules produced per glucose during Glycolysis?",
    options: [
      "A) 2 ATP",
      "B) 4 ATP",
      "C) 32 ATP",
      "D) 0 ATP (Energy investment only)",
    ],
    answer: "A) 2 ATP",
    difficulty: 2,
  },
  {
    id: "q-2",
    conceptId: "c-2",
    subject: "Computer Science",
    conceptName: "Dijkstra's Algorithm Limitations",
    qtype: "mcq",
    question: "Why does Dijkstra's algorithm fail on graphs with negative edge weights?",
    options: [
      "A) It gets stuck in infinite loops on directed acyclic graphs",
      "B) Its greedy assumption finalizes shortest distances permanently, which negative weights can later decrease",
      "C) Priority queues cannot store negative numbers",
      "D) It only operates on trees, not graphs",
    ],
    answer: "B) Its greedy assumption finalizes shortest distances permanently, which negative weights can later decrease",
    difficulty: 4,
  },
  {
    id: "q-3",
    conceptId: "c-3",
    subject: "Physics",
    conceptName: "Born Rule Interpretation",
    qtype: "short",
    question: "Explain what the square of the wavefunction |Ψ(x)|² represents according to the Born Rule.",
    options: null,
    answer: "It represents the probability density of locating the particle at position x upon measurement.",
    difficulty: 3,
  },
  {
    id: "q-4",
    conceptId: "c-4",
    subject: "Biology",
    conceptName: "Electron Transport Chain",
    qtype: "mcq",
    question: "What is the final electron acceptor in the mitochondrial electron transport chain?",
    options: [
      "A) Carbon dioxide (CO2)",
      "B) Oxygen (O2)",
      "C) NAD+",
      "D) Pyruvate",
    ],
    answer: "B) Oxygen (O2)",
    difficulty: 2,
  },
  {
    id: "q-5",
    conceptId: "c-5",
    subject: "Computer Science",
    conceptName: "Priority Queue Complexity",
    qtype: "mcq",
    question: "What is the time complexity of Dijkstra's algorithm implemented with a binary min-heap?",
    options: [
      "A) O(V²)",
      "B) O((V + E) log V)",
      "C) O(V × E)",
      "D) O(E²)",
    ],
    answer: "B) O((V + E) log V)",
    difficulty: 3,
  },
];

export default function QuestionsPage() {
  const [selectedSubject, setSelectedSubject] = useState<string>("All");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [shortInput, setShortInput] = useState("");
  const [isGraded, setIsGraded] = useState(false);
  const [score, setScore] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  const filteredQuestions = PRACTICE_BANK.filter((q) => {
    if (selectedSubject !== "All" && q.subject !== selectedSubject) return false;
    return true;
  });

  const currentQ = filteredQuestions[currentIndex] || filteredQuestions[0];
  const isMcq = currentQ?.qtype === "mcq";

  function handleGrade() {
    if (isGraded || !currentQ) return;
    setIsGraded(true);
    setCompletedCount((c) => c + 1);

    if (isMcq) {
      if (selectedOption?.trim().startsWith(currentQ.answer.substring(0, 2))) {
        setScore((s) => s + 1);
      }
    } else {
      if (shortInput.toLowerCase().includes("probability") || shortInput.toLowerCase().includes("density")) {
        setScore((s) => s + 1);
      }
    }
  }

  function handleNext() {
    setSelectedOption(null);
    setShortInput("");
    setIsGraded(false);
    if (currentIndex < filteredQuestions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setCurrentIndex(0);
    }
  }

  return (
    <main className="relative min-h-screen px-4 pb-24 sm:px-8">
      <div className="mx-auto max-w-3xl pt-4 sm:pt-8">
        {/* Top Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold mb-3">
            <span>Active Practice Arena</span>
          </div>
          <h1 className="display text-3xl sm:text-4xl font-extrabold text-slate-900">
            Practice & Test Recall
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            Deliberate active testing across concepts to reinforce long-term memory.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-2xl border border-slate-200/90 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 pl-2">
              <Filter className="h-3.5 w-3.5 text-slate-400" /> Subject:
            </span>
            {["All", "Biology", "Computer Science", "Physics"].map((sub) => (
              <button
                key={sub}
                onClick={() => {
                  setSelectedSubject(sub);
                  setCurrentIndex(0);
                  setIsGraded(false);
                }}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  selectedSubject === sub
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Score: {score}/{completedCount}
            </span>
          </div>
        </div>

        {/* Active Question Card */}
        {currentQ ? (
          <div className="mt-6">
            <LiquidGlassCard depth="medium" className="p-7 sm:p-9 border-slate-200/90 bg-white/95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-indigo-600 font-bold">{currentQ.subject}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs text-slate-600">{currentQ.conceptName}</span>
                </div>
                <LiquidGlassBadge variant="amber" size="sm">
                  Difficulty {currentQ.difficulty}/5
                </LiquidGlassBadge>
              </div>

              <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 mt-5 leading-snug">
                {currentQ.question}
              </h2>

              {/* MCQ Options */}
              {isMcq && currentQ.options && (
                <div className="mt-6 space-y-2.5">
                  {currentQ.options.map((opt) => {
                    const isSelected = selectedOption === opt;
                    const isCorrect = opt.trim().startsWith(currentQ.answer.substring(0, 2));

                    let borderStyle = "border-slate-200 bg-slate-50 hover:bg-slate-100/80 text-slate-700";
                    if (isGraded) {
                      if (isCorrect) {
                        borderStyle = "border-emerald-400 bg-emerald-50 text-emerald-900 font-semibold";
                      } else if (isSelected && !isCorrect) {
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
                        disabled={isGraded}
                        onClick={() => setSelectedOption(opt)}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all text-xs sm:text-sm ${borderStyle}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Short Answer */}
              {!isMcq && (
                <div className="mt-6 space-y-3">
                  <textarea
                    value={shortInput}
                    onChange={(e) => setShortInput(e.target.value)}
                    disabled={isGraded}
                    rows={4}
                    placeholder="Type your explanation in your own words…"
                    className="w-full rounded-xl p-3.5 text-xs sm:text-sm text-slate-800 outline-none border border-slate-200 bg-slate-50/70 focus:border-slate-400 focus:bg-white"
                  />
                  {isGraded && (
                    <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-100 text-xs sm:text-sm text-indigo-900">
                      <b>Model Answer:</b> {currentQ.answer}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Question {currentIndex + 1} of {filteredQuestions.length}
                </span>

                {!isGraded ? (
                  <LiquidGlassButton
                    onClick={handleGrade}
                    disabled={isMcq ? !selectedOption : !shortInput.trim()}
                    icon={<CheckCircle2 className="h-4 w-4" />}
                  >
                    Check Answer
                  </LiquidGlassButton>
                ) : (
                  <LiquidGlassButton
                    onClick={handleNext}
                    variant="primary"
                    icon={<ArrowRight className="h-4 w-4" />}
                  >
                    Next Question →
                  </LiquidGlassButton>
                )}
              </div>
            </LiquidGlassCard>
          </div>
        ) : (
          <div className="mt-12 text-center text-xs text-slate-500">
            No questions found matching this filter.
          </div>
        )}
      </div>
    </main>
  );
}
