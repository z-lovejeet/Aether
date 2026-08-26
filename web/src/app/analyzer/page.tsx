"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Brain,
  TrendingUp,
  Activity,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { LiquidGlassCard } from "@/components/glass/LiquidGlassCard";
import { LiquidGlassButton } from "@/components/glass/LiquidGlassButton";
import { LiquidGlassBadge } from "@/components/glass/LiquidGlassBadge";

export default function AnalyzerPage() {
  const [learningDNA, setLearningDNA] = useState<any>({
    archetype: "Visual-Intuitive Synthesizer",
    primaryStyle: "analogy",
    interests: ["Basketball", "Space Exploration", "Game Theory"],
    pace: "Fast",
    modality: "Visual + Text + Audio",
    bestStrategy: "analogy",
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("learning_dna");
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setLearningDNA((prev: any) => ({ ...prev, ...parsed }));
        } catch {
          /* ignore */
        }
      }
    }
  }, []);

  return (
    <main className="relative min-h-screen px-4 pb-24 sm:px-8">
      <div className="mx-auto max-w-4xl pt-4 sm:pt-8">
        {/* Top Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold mb-3">
            <span>Cognitive Intelligence</span>
          </div>
          <h1 className="display text-3xl sm:text-4xl font-extrabold text-slate-900">
            Memory Retention Telemetry
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            Real-time analytics on memory decay curves, strategy win-rates, and cognitive evolution.
          </p>
        </div>

        {/* ─── Top Stats Bento ─── */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {[
            { label: "Retention Rate", value: "94.2%", icon: TrendingUp, color: "text-emerald-600" },
            { label: "Avg Ease Factor", value: "2.68", icon: Brain, color: "text-indigo-600" },
            { label: "Active Concepts", value: "38", icon: Activity, color: "text-sky-600" },
            { label: "Rescued Misconceptions", value: "14", icon: ShieldCheck, color: "text-amber-600" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <LiquidGlassCard key={stat.label} depth="low" className="p-4 sm:p-5 text-center bg-white/95">
                <div className="flex justify-center mb-1.5">
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <p className={`font-display text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{stat.label}</p>
              </LiquidGlassCard>
            );
          })}
        </div>

        {/* ─── Memory Decay Curve Simulation ─── */}
        <section className="mt-6">
          <LiquidGlassCard depth="medium" className="p-6 sm:p-8 border-slate-200/90 bg-white/95">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold text-slate-900">
                  Ebbinghaus Memory Decay vs. SM-2 Spaced Retrieval
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Retention forecast over 30 days after initial ingestion
                </p>
              </div>
              <LiquidGlassBadge variant="emerald">Mathematical Inoculation</LiquidGlassBadge>
            </div>

            {/* Visual Decay Bar Representation */}
            <div className="mt-6 space-y-5">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-rose-700">Without Spaced Repetition (Passive Highlighting)</span>
                  <span className="text-rose-700 font-mono">18% Retention at Day 7</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  <div className="h-full bg-rose-500 w-[18%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-emerald-700">With Aether (SM-2 Interval Scheduling)</span>
                  <span className="text-emerald-700 font-mono">94% Retention at Day 30</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  <div className="h-full bg-emerald-500 w-[94%]" />
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-slate-50 p-3.5 border border-slate-200/80 text-xs text-slate-600 leading-relaxed">
              💡 <b>How SM-2 Saves Time:</b> You only review cards on the exact day their probability of recall drops below 85%, preventing over-studying and maximizing long-term retention.
            </div>
          </LiquidGlassCard>
        </section>

        {/* ─── Strategy Win-Rate Rankings ─── */}
        <section className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          <LiquidGlassCard depth="low" className="p-6 border-slate-200/90 bg-white/95">
            <h3 className="font-display text-base font-bold text-slate-900 mb-0.5">
              Pedagogical Strategy Win-Rates
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Which remediation strategies work best for your brain
            </p>

            <div className="space-y-3.5 text-xs">
              {[
                { name: "Analogy / Metaphor", rate: 92, count: "12/13" },
                { name: "Visual Coordinate Flow", rate: 86, count: "6/7" },
                { name: "Step-by-Step Algorithmic", rate: 78, count: "7/9" },
                { name: "Simpler First Principles", rate: 71, count: "5/7" },
                { name: "Narrative & Discovery Story", rate: 64, count: "4/6" },
              ].map((s) => (
                <div key={s.name}>
                  <div className="flex justify-between text-slate-700 mb-1">
                    <span className="font-medium">{s.name}</span>
                    <span className="font-mono text-slate-500">{s.count} ({s.rate}%)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full"
                      style={{ width: `${s.rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </LiquidGlassCard>

          {/* ─── Learning DNA Profile Card ─── */}
          <LiquidGlassCard depth="low" className="p-6 border-slate-200/90 bg-white/95 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-0.5">
                <h3 className="font-display text-base font-bold text-slate-900">
                  Active Learning DNA
                </h3>
                <LiquidGlassBadge variant="indigo" size="sm">Calibrated</LiquidGlassBadge>
              </div>
              <p className="text-xs text-slate-500 mb-5">
                Your personalized cognitive architecture profile
              </p>

              <div className="space-y-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex justify-between items-center">
                  <span className="text-slate-500">Archetype:</span>
                  <span className="font-bold text-slate-900">{learningDNA.archetype || "Visual-Intuitive Synthesizer"}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex justify-between items-center">
                  <span className="text-slate-500">Primary Modality:</span>
                  <span className="font-bold text-indigo-600">Dual Coding (Visual + Spoken)</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex justify-between items-center">
                  <span className="text-slate-500">Winning Strategy:</span>
                  <span className="font-bold text-emerald-700 capitalize">{learningDNA.bestStrategy || "Analogy"}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-slate-500 block mb-1">Memory Hook Anchors:</span>
                  <div className="flex flex-wrap gap-1">
                    {(learningDNA.interests && learningDNA.interests.length > 0
                      ? learningDNA.interests
                      : ["Basketball", "Space", "Game Theory"]
                    ).map((int: string) => (
                      <span key={int} className="px-2 py-0.5 rounded-md bg-white text-slate-700 border border-slate-200 text-[11px] font-medium">
                        #{int}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 text-center">
              <Link href="/onboarding">
                <LiquidGlassButton variant="secondary" size="sm" className="w-full">
                  Re-calibrate Profile →
                </LiquidGlassButton>
              </Link>
            </div>
          </LiquidGlassCard>
        </section>
      </div>
    </main>
  );
}
