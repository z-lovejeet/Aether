"use client";

import { useEffect, useRef, useState } from "react";
import { subscribeToSession, type PipelineEvent } from "@/lib/agent-client";

const LANES = [
  { id: "ingestion_agent", label: "Ingestion" },
  { id: "concept_architect", label: "Concept Graph" },
  { id: "content_forge", label: "Asset Synthesis" },
];

interface Props {
  sessionId: string | null;
}

export function AgentPipelineIndicator({ sessionId }: Props) {
  const [states, setStates] = useState<Record<string, { state: "idle" | "active" | "done"; ms?: number }>>(
    Object.fromEntries(LANES.map((l) => [l.id, { state: "idle" as const }])),
  );
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    setStates(Object.fromEntries(LANES.map((l) => [l.id, { state: "idle" as const }])));
    unsubRef.current = subscribeToSession(sessionId, (e: PipelineEvent) => {
      if (!e.node || !(e.node in states)) return;
      if (e.event === "node_start") {
        setStates((s) => ({ ...s, [e.node!]: { state: "active" } }));
      } else if (e.event === "node_end") {
        setStates((s) => ({ ...s, [e.node!]: { state: "done", ms: e.latencyMs } }));
      }
    });
    return () => unsubRef.current?.();
  }, [sessionId]);

  return (
    <div className="flex items-center justify-center gap-2.5 sm:gap-3.5">
      {LANES.map((lane, i) => {
        const s = states[lane.id] ?? { state: "idle" as const };
        return (
          <div key={lane.id} className="flex items-center gap-2.5 sm:gap-3.5">
            <div
              className={`rounded-2xl px-4 py-3 border transition-all duration-200 flex flex-col items-center gap-0.5 ${
                s.state === "active"
                  ? "bg-white border-slate-900 shadow-md scale-105"
                  : s.state === "done"
                  ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                  : "bg-slate-100/80 border-slate-200/80 text-slate-400 opacity-60"
              }`}
            >
              <span className="text-xs font-semibold text-slate-900">{lane.label}</span>
              <span className="text-[10px] text-slate-500 font-mono">
                {s.state === "done" ? `${((s.ms ?? 0) / 1000).toFixed(1)}s ✓` : s.state === "active" ? "Processing…" : "Queued"}
              </span>
            </div>
            {i < LANES.length - 1 && (
              <div
                className={`h-0.5 w-4 sm:w-8 rounded-full ${
                  s.state === "done" ? "bg-emerald-400" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
