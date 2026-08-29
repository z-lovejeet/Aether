"use client";

import Link from "next/link";
import Image from "next/image";
import { GitBranch, ExternalLink, Cpu, Zap, ArrowUpRight } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative mt-24 border-t border-slate-200 bg-white/60 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand Column */}
          <div className="md:col-span-2 space-y-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative flex h-7 w-7 items-center justify-center rounded-lg overflow-hidden shadow-xs border border-slate-200/50 bg-slate-950 transition-transform duration-200 group-hover:scale-105">
                <Image
                  src="/icon.png"
                  alt="Aether Logo"
                  width={28}
                  height={28}
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="font-display text-lg font-bold text-slate-900">
                Aether <span className="text-xs text-slate-500 font-mono">OS</span>
              </span>
            </Link>
            <p className="max-w-md text-sm leading-relaxed text-slate-600 font-body">
              An intelligent cognitive study system that turns any textbook, note, or lecture into permanent understanding using active recall and SM-2 spaced repetition.
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
              <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Multi-Agent Cluster Operational
              </span>
              <span>•</span>
              <span>FastAPI & Supabase</span>
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 className="font-display text-xs font-semibold uppercase tracking-wider text-slate-900">
              Platform
            </h4>
            <ul className="mt-3.5 space-y-2 text-xs sm:text-sm text-slate-600">
              <li>
                <Link href="/upload" className="hover:text-slate-900 transition-colors">
                  Study Studio
                </Link>
              </li>
              <li>
                <Link href="/questions" className="hover:text-slate-900 transition-colors">
                  Practice Arena
                </Link>
              </li>
              <li>
                <Link href="/analyzer" className="hover:text-slate-900 transition-colors">
                  Memory Analyzer
                </Link>
              </li>
              <li>
                <Link href="/results" className="hover:text-slate-900 transition-colors">
                  Saved Systems
                </Link>
              </li>
              <li>
                <Link href="/onboarding" className="hover:text-slate-900 transition-colors">
                  Learning DNA Profile
                </Link>
              </li>
            </ul>
          </div>

          {/* Architecture & Science */}
          <div>
            <h4 className="font-display text-xs font-semibold uppercase tracking-wider text-slate-900">
              Architecture & Science
            </h4>
            <ul className="mt-3.5 space-y-2 text-xs sm:text-sm text-slate-600">
              <li>
                <Link href="/about" className="hover:text-slate-900 transition-colors flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-indigo-600" />
                  <span>8 Specialist Agents</span>
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-slate-900 transition-colors flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-600" />
                  <span>Remediation Ladder</span>
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/z-lovejeet/Aether"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-slate-900 transition-colors flex items-center gap-1.5"
                >
                  <GitBranch className="h-3.5 w-3.5 text-slate-500" />
                  <span>GitHub Repository</span>
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              </li>
              <li>
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 mt-1">
                  Built for August AI Challenge
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 Aether OS. Clean, human-centered cognitive software.</p>
          <p className="flex items-center gap-1">
            Engineered with <span className="text-slate-800 font-medium">Gemini 3.7 Flash</span> & <span className="text-slate-800 font-medium">Groq Llama 3</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
