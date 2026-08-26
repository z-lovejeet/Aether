"use client";

import { useEffect, useRef, useState } from "react";
import { subscribeToSession, type PipelineEvent } from "@/lib/agent-client";

const LANES = [
  { id: "ingestion_agent", label: "🔍 Ingestion" },
  { id: "concept_architect", label: "🏛️ Concepts" },
  { id: "content_forge", label: "✍️ Content" },
];

interface Props {
  sessionId: string | null;
}

/** Live agent pipeline indicator (docs/07 Flow-1 processing screen). */
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4">
      {LANES.map((lane, i) => {
        const s = states[lane.id] ?? { state: "idle" as const };
        return (
          <div key={lane.id} className="flex items-center gap-3 sm:gap-4">
            <div
              className={`glass glass-sheen flex flex-col items-center gap-1 px-4 py-3 transition-all duration-300 ${
                s.state === "active"
                  ? "scale-105 border border-[var(--color-accent)] shadow-[0_0_24px_rgba(139,92,246,0.45)]"
                  : s.state === "done"
                    ? "opacity-80"
                    : "opacity-40"
              }`}
            >
              <span className="text-sm font-medium">{lane.label}</span>
              <span className="text-[11px] text-[var(--text-secondary)]">
                {s.state === "done" ? `${((s.ms ?? 0) / 1000).toFixed(1)}s ✓` : s.state}
              </span>
            </div>
            {i < LANES.length - 1 && (
              <div
                className={`h-px w-6 sm:w-10 ${
                  s.state === "done" ? "bg-[var(--aurora-2)]" : "bg-white/15"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
