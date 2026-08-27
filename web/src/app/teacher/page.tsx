"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  Sparkles,
  Printer,
  Copy,
  Check,
  FileText,
  Layers,
  Target,
  ArrowRight,
  BookOpen,
  Download,
  RotateCcw,
} from "lucide-react";
import { LiquidGlassCard } from "@/components/glass/LiquidGlassCard";
import { LiquidGlassButton } from "@/components/glass/LiquidGlassButton";
import { LiquidGlassBadge } from "@/components/glass/LiquidGlassBadge";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { generatePracticeQuestions } from "@/lib/agent-client";

interface WorksheetLevel {
  level: "Beginner (Scaffolded)" | "Intermediate (Standard)" | "Advanced (Olympiad)";
  description: string;
  questions: string[];
}

export default function TeacherModePage() {
  const [topic, setTopic] = useState("Photosynthesis & Light Reactions");
  const [gradeLevel, setGradeLevel] = useState("Grade 10 / High School");
  const [learningObjective, setLearningObjective] = useState("Understand how photons excite chlorophyll electrons and generate ATP/NADPH.");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedWorksheet, setGeneratedWorksheet] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerateWorksheet() {
    if (!topic.trim()) return;
    setIsGenerating(true);

    try {
      // Use practice generator backend to draft high-yield teacher questions
      const res = await generatePracticeQuestions({
        subject: "Curriculum Material",
        topics: `${topic} (${gradeLevel}). Objective: ${learningObjective}`,
        level: "intermediate",
        count: 6,
        goal: "exam",
      });

      const qList = res.questions || [];
      const mcqs = qList.filter((q) => q.qtype === "mcq");
      const frqs = qList.filter((q) => q.qtype !== "mcq");

      const markdown = `
# 📚 Classroom Worksheet: ${topic}
**Subject / Level:** ${gradeLevel}  
**Learning Objective:** ${learningObjective}  
**Date:** ________________________ &nbsp;&nbsp;&nbsp;&nbsp; **Student Name:** ________________________

---

### Section A: Foundational Concept Check (Multiple Choice)
${mcqs
  .map(
    (q, i) => `
**Q${i + 1}.** ${q.question}
${q.options?.map((opt) => `- [ ] ${opt}`).join("\n")}
`,
  )
  .join("\n")}

---

### Section B: Deep Application & Analysis (Free Response)
${frqs
  .map(
    (q, i) => `
**Q${mcqs.length + i + 1}.** ${q.question}

*Hint:* ${q.hint}

\`\`\`
Answer / Explanation:
____________________________________________________________________________________
____________________________________________________________________________________
\`\`\`
`,
  )
  .join("\n")}

---

### 🔑 Teacher Answer Key & Rubric (Confidential)
${qList
  .map(
    (q, i) => `
- **Q${i + 1} Expected Answer:** ${q.answer}  
  *Grading Rationale:* ${q.explanation}
`,
  )
  .join("\n")}
`;

      setGeneratedWorksheet(markdown.trim());
    } catch {
      // Fallback template
      setGeneratedWorksheet(`
# 📚 Classroom Worksheet: ${topic}
**Subject / Level:** ${gradeLevel}  
**Student Name:** ________________________ &nbsp;&nbsp;&nbsp;&nbsp; **Score:** ____ / 20

### Section A: Key Definitions
1. Define the fundamental mechanism of **${topic}**.
2. Outline the primary input variables and resultant outputs.

### Section B: Problem Solving
1. Explain how a perturbation in the initial state affects equilibrium.
2. Formulate a mathematical or conceptual model to demonstrate this effect.

### Section C: Exit Ticket
- What was the most critical takeaway from today's study session?
`);
    } finally {
      setIsGenerating(false);
    }
  }

  function handleCopy() {
    if (!generatedWorksheet) return;
    navigator.clipboard.writeText(generatedWorksheet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="relative min-h-screen px-4 pb-24 sm:px-8">
      <div className="mx-auto max-w-4xl pt-4 sm:pt-8">
        {/* Top Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900 text-white text-xs font-semibold mb-3 shadow-xs">
            <GraduationCap className="h-3.5 w-3.5 text-amber-400" />
            <span>Teacher & Educator Mode</span>
          </div>
          <h1 className="display text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Curriculum & Worksheet Architect
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
            Generate tiered printable classroom worksheets, exit quizzes, and teacher answer keys in seconds.
          </p>
        </div>

        {!generatedWorksheet ? (
          /* Generator Form */
          <LiquidGlassCard depth="medium" className="p-6 sm:p-8 bg-white/95 border-slate-200 shadow-sm">
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Lesson Topic / Subject
                </label>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Mitosis vs Meiosis, Newton's Laws, Bayesian Probability…"
                  className="w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none border border-slate-200 bg-slate-50 focus:border-slate-400 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Target Grade / Level
                  </label>
                  <select
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none border border-slate-200 bg-slate-50 focus:border-slate-400 focus:bg-white"
                  >
                    <option value="Middle School (Grade 6-8)">Middle School (Grade 6-8)</option>
                    <option value="Grade 10 / High School">Grade 10 / High School</option>
                    <option value="AP / IB Diploma Level">AP / IB Diploma Level</option>
                    <option value="Undergraduate College">Undergraduate College</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Output Format
                  </label>
                  <div className="rounded-xl px-3.5 py-2 text-xs font-medium text-slate-700 border border-slate-200 bg-slate-50 flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Tiered MCQ + FRQ + Teacher Key</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Core Learning Objective
                </label>
                <textarea
                  value={learningObjective}
                  onChange={(e) => setLearningObjective(e.target.value)}
                  rows={2}
                  placeholder="What should students master by the end of this worksheet?"
                  className="w-full rounded-xl p-3.5 text-xs sm:text-sm text-slate-900 outline-none border border-slate-200 bg-slate-50 focus:border-slate-400 focus:bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <LiquidGlassButton
                  onClick={handleGenerateWorksheet}
                  loading={isGenerating}
                  size="md"
                  icon={<Sparkles className="h-4 w-4 text-amber-300" />}
                >
                  Generate Classroom Worksheet
                </LiquidGlassButton>
              </div>
            </div>
          </LiquidGlassCard>
        ) : (
          /* Preview & Print Screen */
          <div className="space-y-4">
            <div className="flex items-center justify-between" data-no-print>
              <LiquidGlassButton
                onClick={() => setGeneratedWorksheet(null)}
                variant="secondary"
                size="sm"
                icon={<RotateCcw className="h-3.5 w-3.5" />}
              >
                Configure New Lesson
              </LiquidGlassButton>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:text-slate-900 shadow-xs cursor-pointer"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? "Copied" : "Copy Markdown"}</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Worksheet (PDF)</span>
                </button>
              </div>
            </div>

            <LiquidGlassCard depth="medium" className="p-8 sm:p-12 bg-white border-slate-200 shadow-sm">
              <MarkdownRenderer content={generatedWorksheet} />
            </LiquidGlassCard>
          </div>
        )}
      </div>
    </main>
  );
}
