"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  ArrowRight,
  Plus,
  BookOpen,
} from "lucide-react";
import { LiquidGlassCard } from "@/components/glass/LiquidGlassCard";
import { LiquidGlassButton } from "@/components/glass/LiquidGlassButton";
import { LiquidGlassBadge } from "@/components/glass/LiquidGlassBadge";

interface SavedSystem {
  id: string;
  subject: string;
  title: string;
  conceptsCount: number;
  level: string;
  createdAt: string;
  masteryPct: number;
}

const DEFAULT_SYSTEMS: SavedSystem[] = [
  {
    id: "session-biology-1",
    subject: "Biology",
    title: "Cellular Respiration & Glycolysis",
    conceptsCount: 8,
    level: "Intermediate",
    createdAt: "Today",
    masteryPct: 88,
  },
  {
    id: "session-cs-1",
    subject: "Computer Science",
    title: "Dijkstra & Graph Shortest Path",
    conceptsCount: 6,
    level: "Advanced",
    createdAt: "Yesterday",
    masteryPct: 75,
  },
  {
    id: "session-physics-1",
    subject: "Physics",
    title: "Quantum Superposition & Wave Mechanics",
    conceptsCount: 10,
    level: "Advanced",
    createdAt: "3 days ago",
    masteryPct: 62,
  },
];

export default function ResultsPage() {
  const [systems, setSystems] = useState<SavedSystem[]>(DEFAULT_SYSTEMS);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const found: SavedSystem[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.startsWith("study:") || key.startsWith("ingest:"))) {
          try {
            const raw = sessionStorage.getItem(key);
            if (raw) {
              const data = JSON.parse(raw);
              const sid = key.split(":")[1];
              if (!found.some((f) => f.id === sid)) {
                found.push({
                  id: sid,
                  subject: data.subject || "General",
                  title: data.conceptTree?.[0]?.name ? `${data.conceptTree[0].name} Hub` : "Active Study Hub",
                  conceptsCount: data.conceptTree?.length || 5,
                  level: data.level || "Intermediate",
                  createdAt: "Recently Generated",
                  masteryPct: 50,
                });
              }
            }
          } catch {
            /* ignore */
          }
        }
      }
      if (found.length > 0) {
        setSystems((prev) => [...found, ...prev.filter((p) => !found.some((f) => f.id === p.id))]);
      }
    }
  }, []);

  return (
    <main className="relative min-h-screen px-4 pb-24 sm:px-8">
      <div className="mx-auto max-w-5xl pt-4 sm:pt-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold mb-2">
              <span>Study Systems Library</span>
            </div>
            <h1 className="display text-3xl sm:text-4xl font-extrabold text-slate-900">
              Your Knowledge Systems
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              All parsed materials, concept trees, and active review decks.
            </p>
          </div>

          <Link href="/upload">
            <LiquidGlassButton size="md" icon={<Plus className="h-4 w-4" />}>
              Create New System
            </LiquidGlassButton>
          </Link>
        </div>

        {/* ─── Systems Bento Grid ─── */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {systems.map((sys) => (
            <LiquidGlassCard
              key={sys.id}
              depth="medium"
              className="p-6 flex flex-col justify-between border-slate-200/90 bg-white/95 hover:border-slate-300"
            >
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-indigo-600 font-bold">{sys.subject}</span>
                  <span className="text-slate-400 text-[11px]">{sys.createdAt}</span>
                </div>

                <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 mt-2 leading-snug">
                  {sys.title}
                </h3>

                <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-50 border border-slate-200">
                    {sys.conceptsCount} Concepts
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-50 border border-slate-200 capitalize">
                    {sys.level}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mt-6">
                  <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                    <span>Mastery Retention</span>
                    <span className="font-mono text-emerald-700 font-semibold">{sys.masteryPct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${sys.masteryPct}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <Link href={`/study/${sys.id}`} className="block">
                  <LiquidGlassButton variant="primary" size="sm" className="w-full" icon={<ArrowRight className="h-3.5 w-3.5" />}>
                    Open Study Hub
                  </LiquidGlassButton>
                </Link>
              </div>
            </LiquidGlassCard>
          ))}
        </div>
      </div>
    </main>
  );
}
