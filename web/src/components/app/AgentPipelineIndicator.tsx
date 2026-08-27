"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Dna,
  Network,
  Zap,
  Target,
  Layers,
  CheckCircle2,
  Loader2,
  Terminal,
  Sparkles,
  Clock,
  Cpu,
} from "lucide-react";
import { subscribeToSession, type PipelineEvent } from "@/lib/agent-client";

/* ─── 6 Autonomous Agents in the Aether Pipeline ─────────────── */

interface AgentDef {
  id: string;
  name: string;
  role: string;
  icon: typeof FileText;
  color: string;
  activeColor: string;
  defaultMsg: string;
}

const AGENTS: AgentDef[] = [
  {
    id: "ingestion_agent",
    name: "Ingestion",
    role: "Normalize & Cleanse",
    icon: FileText,
    color: "#6366f1",
    activeColor: "border-indigo-500 bg-indigo-50/50 text-indigo-900",
    defaultMsg: "Normalizing text and formatting markdown structure…",
  },
  {
    id: "learning_dna",
    name: "Learning DNA",
    role: "Cognitive Profiling",
    icon: Dna,
    color: "#8b5cf6",
    activeColor: "border-purple-500 bg-purple-50/50 text-purple-900",
    defaultMsg: "Aligning explanation style and cognitive difficulty…",
  },
  {
    id: "concept_architect",
    name: "Concept Architect",
    role: "Hierarchical DAG",
    icon: Network,
    color: "#0ea5e9",
    activeColor: "border-sky-500 bg-sky-50/50 text-sky-900",
    defaultMsg: "Building 3-tier concept hierarchy & indexing RAG chunks…",
  },
  {
    id: "content_forge",
    name: "Content Forge",
    role: "Lesson & Formulas",
    icon: Zap,
    color: "#f59e0b",
    activeColor: "border-amber-500 bg-amber-50/50 text-amber-900",
    defaultMsg: "Parallel synthesizing LaTeX lesson & formula cheat sheet…",
  },
  {
    id: "quiz_master",
    name: "Quiz Master",
    role: "Active Recall",
    icon: Target,
    color: "#10b981",
    activeColor: "border-emerald-500 bg-emerald-50/50 text-emerald-900",
    defaultMsg: "Crafting multi-format diagnostic questions & traps…",
  },
  {
    id: "flashcard_smith",
    name: "Flashcard Smith",
    role: "SM-2 Memory Anchors",
    icon: Layers,
    color: "#ec4899",
    activeColor: "border-pink-500 bg-pink-50/50 text-pink-900",
    defaultMsg: "Forging spaced-repetition active recall flashcards…",
  },
];

const STUDY_TIPS = [
  "💡 Active recall through testing builds 2.5× stronger synaptic connections than passive rereading.",
  "⚡ Spaced repetition with the SM-2 algorithm ensures high-yield long-term memory consolidation.",
  "🧠 Socratic remediation targets cognitive misconceptions directly rather than just repeating answers.",
  "📐 Mathematical formulas are rendered in real-time KaTeX with complete step-by-step proofs.",
];

interface Props {
  sessionId: string | null;
}

export function AgentPipelineIndicator({ sessionId }: Props) {
  const [activeAgentIdx, setActiveAgentIdx] = useState(0);
  const [states, setStates] = useState<
    Record<string, { state: "idle" | "active" | "done"; ms?: number }>
  >(Object.fromEntries(AGENTS.map((a) => [a.id, { state: "idle" as const }])));
  const [logs, setLogs] = useState<Array<{ id: string; time: string; text: string; agent: string }>>([]);
  const [tipIdx, setTipIdx] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const unsubRef = useRef<(() => void) | null>(null);

  // Timer ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Tip rotator
  useEffect(() => {
    const tipTimer = setInterval(() => {
      setTipIdx((prev) => (prev + 1) % STUDY_TIPS.length);
    }, 4500);
    return () => clearInterval(tipTimer);
  }, []);

  // Simulated agent progression if SSE is buffering
  useEffect(() => {
    const progressInterval = setInterval(() => {
      setActiveAgentIdx((prev) => {
        const next = Math.min(prev + 1, AGENTS.length - 1);
        const currAgent = AGENTS[prev];
        const nextAgent = AGENTS[next];

        setStates((s) => ({
          ...s,
          [currAgent.id]: { state: "done", ms: 1200 + prev * 800 },
          [nextAgent.id]: { state: "active" },
        }));

        setLogs((prevLogs) => {
          if (prevLogs.some((l) => l.agent === nextAgent.name)) return prevLogs;
          return [
            ...prevLogs,
            {
              id: `${Date.now()}-${nextAgent.id}`,
              time: `${(prev * 1.8 + 1.2).toFixed(1)}s`,
              agent: nextAgent.name,
              text: nextAgent.defaultMsg,
            },
          ];
        });

        return next;
      });
    }, 2200);

    return () => clearInterval(progressInterval);
  }, []);

  // Live SSE listener
  useEffect(() => {
    if (!sessionId) return;
    unsubRef.current = subscribeToSession(sessionId, (e: PipelineEvent) => {
      if (!e.node) return;
      const matchedIdx = AGENTS.findIndex((a) => a.id === e.node);
      if (matchedIdx !== -1) {
        setActiveAgentIdx(matchedIdx);
      }

      if (e.event === "node_start") {
        setStates((s) => ({ ...s, [e.node!]: { state: "active" } }));
        setLogs((l) => [
          ...l,
          {
            id: `${Date.now()}-${e.node}`,
            time: `${((e.latencyMs ?? 0) / 1000).toFixed(1)}s`,
            agent: AGENTS.find((a) => a.id === e.node)?.name || e.node!,
            text: `Starting ${e.node} execution…`,
          },
        ]);
      } else if (e.event === "node_end") {
        setStates((s) => ({
          ...s,
          [e.node!]: { state: "done", ms: e.latencyMs },
        }));
      }
    });

    return () => unsubRef.current?.();
  }, [sessionId]);

  // Compute overall progress percentage
  const completedCount = Object.values(states).filter((s) => s.state === "done").length;
  const progressPercent = Math.min(
    95,
    Math.max(15, Math.round(((completedCount + 0.5) / AGENTS.length) * 100)),
  );

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* ── Top Progress Status Bar ── */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600" />
            </span>
            <span className="font-bold text-slate-900">
              Multi-Agent Pipeline Active
            </span>
            <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-700">
              6 Agents Orchestrating
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>{elapsedSec}s elapsed</span>
            </span>
            <span className="font-bold text-slate-900">{progressPercent}%</span>
          </div>
        </div>

        {/* Progress bar line */}
        <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-full"
            animate={{ width: `${progressPercent}%` }}
            transition={{ ease: "easeOut", duration: 0.5 }}
          />
        </div>
      </div>

      {/* ── 6 Autonomous Agent Flow Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {AGENTS.map((agent, i) => {
          const s = states[agent.id] ?? { state: "idle" as const };
          const Icon = agent.icon;
          const isActive = s.state === "active" || activeAgentIdx === i;
          const isDone = s.state === "done";

          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`relative rounded-2xl p-3.5 border-2 transition-all duration-200 flex flex-col justify-between select-none ${
                isDone
                  ? "bg-emerald-50/70 border-emerald-300 text-emerald-950 shadow-xs"
                  : isActive
                  ? `bg-white ${agent.activeColor} ring-4 ring-indigo-500/20 shadow-md scale-[1.03]`
                  : "bg-slate-50/80 border-slate-200/80 text-slate-400 opacity-60"
              }`}
            >
              <div>
                {/* Agent Icon + Status Indicator */}
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
                      isDone
                        ? "bg-emerald-100 text-emerald-700"
                        : isActive
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : isActive ? (
                    <Loader2 className="h-4 w-4 text-indigo-600 animate-spin" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-slate-300" />
                  )}
                </div>

                <h4 className="font-display text-xs font-bold text-slate-900 leading-tight">
                  {agent.name}
                </h4>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-tight">
                  {agent.role}
                </p>
              </div>

              {/* Bottom State / Latency */}
              <div className="mt-3 border-t border-slate-200/60 pt-1.5 flex items-center justify-between text-[10px] font-mono">
                <span
                  className={`font-semibold ${
                    isDone
                      ? "text-emerald-700"
                      : isActive
                      ? "text-indigo-700"
                      : "text-slate-400"
                  }`}
                >
                  {isDone ? "Done" : isActive ? "Running…" : "Queued"}
                </span>

                {s.ms && (
                  <span className="text-slate-500">
                    {(s.ms / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Live Agent Orchestration Console Feed ── */}
      <div className="rounded-3xl border border-slate-800 bg-[#090e1a] p-4 text-left shadow-lg overflow-hidden">
        {/* macOS Terminal Window Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 px-1 text-slate-400">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </div>
            <span className="ml-2 font-mono text-[11px] font-semibold text-slate-300 flex items-center gap-1">
              <Terminal className="h-3 w-3 text-indigo-400" />
              <span>aether-agent-orchestrator.log</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
            <Cpu className="h-3 w-3 text-emerald-400" />
            <span>Groq + Gemini 3.7 Engine</span>
          </div>
        </div>

        {/* Console Log Lines */}
        <div className="mt-3 space-y-1.5 font-mono text-[11px] text-slate-300 max-h-32 overflow-y-auto pr-1">
          {logs.slice(-5).map((log) => (
            <div key={log.id} className="flex items-start gap-2 leading-relaxed">
              <span className="text-slate-500 shrink-0">[{log.time}]</span>
              <span className="text-indigo-400 font-bold shrink-0">
                {log.agent}:
              </span>
              <span className="text-slate-300">{log.text}</span>
            </div>
          ))}

          {logs.length === 0 && (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="h-3 w-3 animate-spin text-indigo-400" />
              <span>Initiating LangGraph distributed agent fanout…</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Pedagogical Study Tip Banner ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tipIdx}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-2.5 text-xs text-indigo-900 flex items-center justify-center gap-2 shadow-xs"
        >
          <Sparkles className="h-4 w-4 text-indigo-600 shrink-0" />
          <span className="font-medium text-center">{STUDY_TIPS[tipIdx]}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
