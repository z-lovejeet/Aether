"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  ArrowRight,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  Network,
  AlertTriangle,
  ArrowUpDown,
  Clock,
  Sparkles,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { LiquidGlassCard } from "@/components/glass/LiquidGlassCard";
import { LiquidGlassButton } from "@/components/glass/LiquidGlassButton";
import { EmptyState } from "@/components/app/EmptyState";
import {
  deleteSession,
  deleteMaterial,
  getMaterials,
  clearAllMaterials,
} from "@/lib/agent-client";

interface SavedSystem {
  id: string;
  subject: string;
  title: string;
  conceptsCount: number;
  level: string;
  createdAt: string;
  timestamp: number;
  masteryPct: number;
  materialId?: string;
  isCustom?: boolean;
}

const NOW = Date.now();

const DEFAULT_SYSTEMS: SavedSystem[] = [
  {
    id: "session-biology-1",
    subject: "Biology",
    title: "Cellular Respiration & Glycolysis Hub",
    conceptsCount: 8,
    level: "Intermediate",
    createdAt: "1 day ago",
    timestamp: NOW - 3600 * 1000 * 24,
    masteryPct: 88,
  },
  {
    id: "session-cs-1",
    subject: "Computer Science",
    title: "Dijkstra & Graph Shortest Path Hub",
    conceptsCount: 6,
    level: "Advanced",
    createdAt: "2 days ago",
    timestamp: NOW - 3600 * 1000 * 48,
    masteryPct: 75,
  },
  {
    id: "session-physics-1",
    subject: "Physics",
    title: "Quantum Superposition & Wave Mechanics Hub",
    conceptsCount: 10,
    level: "Advanced",
    createdAt: "3 days ago",
    timestamp: NOW - 3600 * 1000 * 72,
    masteryPct: 62,
  },
];

export default function ResultsPage() {
  const [systems, setSystems] = useState<SavedSystem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"newest" | "mastery" | "concepts">("newest");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [deletedToast, setDeletedToast] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let isMounted = true;
    const wasCleared = localStorage.getItem("library_cleared") === "true";
    const sessionMap = new Map<string, SavedSystem>();

    // 1. Scan sessionStorage (stored reverse chronologically or with timestamps)
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.startsWith("study:") || key.startsWith("ingest:"))) {
        try {
          const raw = sessionStorage.getItem(key);
          if (raw) {
            const data = JSON.parse(raw);
            const sid = key.split(":")[1];
            if (sid && !sessionMap.has(sid)) {
              let ts = Date.now();
              if (data.timestamp && typeof data.timestamp === "number") {
                ts = data.timestamp;
              } else if (data.createdAt) {
                const parsed = new Date(data.createdAt).getTime();
                if (!isNaN(parsed)) ts = parsed;
              }

              sessionMap.set(sid, {
                id: sid,
                materialId: data.materialId,
                subject: data.subject || "General",
                title: data.conceptTree?.[0]?.name ? `${data.conceptTree[0].name} Hub` : "Active Study Hub",
                conceptsCount: data.conceptTree?.length || 5,
                level: data.level || "Intermediate",
                createdAt: data.createdAt ? new Date(data.createdAt).toLocaleDateString() : "Just Now",
                timestamp: ts,
                masteryPct: 60,
                isCustom: true,
              });
            }
          }
        } catch {
          /* ignore */
        }
      }
    }

    // Combine custom session systems
    const baseMap = new Map<string, SavedSystem>();
    for (const [id, sys] of sessionMap.entries()) {
      baseMap.set(id, sys);
    }

    // Only inject default sample systems if library was NEVER cleared and no custom items exist
    if (!wasCleared && baseMap.size === 0) {
      for (const d of DEFAULT_SYSTEMS) {
        baseMap.set(d.id, d);
      }
    }

    setSystems(Array.from(baseMap.values()));

    // 2. Also fetch from backend PostgreSQL and merge uniquely
    getMaterials().then((remoteMaterials) => {
      if (!isMounted) return;
      if (remoteMaterials && remoteMaterials.length > 0) {
        localStorage.removeItem("library_cleared");
        setSystems((prev) => {
          const mergedMap = new Map<string, SavedSystem>();
          for (const s of prev) {
            mergedMap.set(s.id, s);
          }
          for (const m of remoteMaterials) {
            if (!mergedMap.has(m.id)) {
              const parsedDate = m.createdAt ? new Date(m.createdAt) : null;
              const ts = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate.getTime() : Date.now();
              mergedMap.set(m.id, {
                id: m.id,
                materialId: m.id,
                subject: m.subject || "General",
                title: `${m.title} Hub`,
                conceptsCount: m.conceptsCount || 4,
                level: "Intermediate",
                createdAt: parsedDate ? parsedDate.toLocaleDateString() : "Saved",
                timestamp: ts,
                masteryPct: 65,
                isCustom: true,
              });
            }
          }
          return Array.from(mergedMap.values());
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleDelete(id: string, materialId?: string) {
    // 1. Remove from local state
    const sysToDelete = systems.find((s) => s.id === id);
    const updated = systems.filter((s) => s.id !== id);
    setSystems(updated);
    setDeleteConfirmId(null);

    if (updated.length === 0 && typeof window !== "undefined") {
      localStorage.setItem("library_cleared", "true");
    }

    // 2. Remove from sessionStorage
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(`study:${id}`);
      sessionStorage.removeItem(`ingest:${id}`);
    }

    // 3. Remove from backend database if UUID
    if (materialId) {
      deleteMaterial(materialId);
    }
    deleteSession(id);

    // 4. Show confirmation toast
    setDeletedToast(sysToDelete?.title || "Study system");
    setTimeout(() => setDeletedToast(null), 3500);
  }

  async function handleClearAllLibrary() {
    setIsClearing(true);
    try {
      // 1. Backend database wipe
      await clearAllMaterials();

      // 2. Mark library as explicitly cleared in localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("library_cleared", "true");
        const keysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k && (k.startsWith("study:") || k.startsWith("ingest:"))) {
            keysToRemove.push(k);
          }
        }
        for (const k of keysToRemove) {
          sessionStorage.removeItem(k);
        }
      }

      // 3. Reset local state to empty
      setSystems([]);
      setClearConfirmOpen(false);
      setDeletedToast("Library completely cleared.");
      setTimeout(() => setDeletedToast(null), 3500);
    } catch (err) {
      console.error("Failed to clear library:", err);
    } finally {
      setIsClearing(false);
    }
  }

  function handleRestoreDemos() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("library_cleared");
    }
    setSystems(DEFAULT_SYSTEMS);
    setDeletedToast("Demo study decks restored.");
    setTimeout(() => setDeletedToast(null), 3500);
  }

  const subjects = useMemo(() => {
    const list = Array.from(new Set(systems.map((s) => s.subject)));
    return ["All", ...list];
  }, [systems]);

  // STRICT NEWEST-FIRST SORTING
  const filteredSystems = useMemo(() => {
    const seen = new Set<string>();
    return systems
      .filter((s) => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        if (selectedSubject !== "All" && s.subject !== selectedSubject) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            s.title.toLowerCase().includes(q) ||
            s.subject.toLowerCase().includes(q) ||
            s.level.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "mastery") return b.masteryPct - a.masteryPct;
        if (sortBy === "concepts") return b.conceptsCount - a.conceptsCount;
        // Strictly Newest First by timestamp
        const timeA = a.timestamp ?? 0;
        const timeB = b.timestamp ?? 0;
        return timeB - timeA;
      });
  }, [systems, selectedSubject, searchQuery, sortBy]);

  return (
    <main className="relative min-h-screen px-4 pb-24 sm:px-8">
      <div className="mx-auto max-w-5xl pt-4 sm:pt-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold mb-2">
              <Layers className="h-3.5 w-3.5 text-indigo-600" />
              <span>Study Systems Library</span>
            </div>
            <h1 className="display text-3xl sm:text-4xl font-extrabold text-slate-900">
              Your Knowledge Systems
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              All parsed materials, concept trees, active review decks, and AI notes.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {systems.length > 0 && (
              <button
                onClick={() => setClearConfirmOpen(true)}
                className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Clear all materials and study history"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear Library</span>
              </button>
            )}

            <Link href="/upload">
              <LiquidGlassButton size="md" icon={<Plus className="h-4 w-4" />}>
                Create New System
              </LiquidGlassButton>
            </Link>
          </div>
        </div>

        {/* ─── Clear All Confirmation Modal / Banner ─── */}
        <AnimatePresence>
          {clearConfirmOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 p-4 rounded-2xl border border-rose-300 bg-rose-50/95 text-rose-950 text-xs shadow-md"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm text-rose-900">Clear all study materials from library?</p>
                    <p className="text-rose-700 mt-0.5">
                      This will permanently remove all concept trees, quizzes, flashcards, and notes. This cannot be undone.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    disabled={isClearing}
                    onClick={handleClearAllLibrary}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    {isClearing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    <span>{isClearing ? "Clearing…" : "Yes, Clear Everything"}</span>
                  </button>
                  <button
                    disabled={isClearing}
                    onClick={() => setClearConfirmOpen(false)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-800 font-semibold text-xs hover:bg-rose-100/60 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Search, Filters & Sort Bar ─── */}
        <div className="mt-6 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by topic, subject, or keywords…"
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Subject Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {subjects.map((sub) => (
                <button
                  key={sub}
                  onClick={() => setSelectedSubject(sub)}
                  className={`px-3 py-1.5 text-xs rounded-xl font-medium transition-all shrink-0 ${
                    selectedSubject === sub
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200/70 text-slate-600 border border-slate-200"
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-600">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[11px] text-slate-400">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent font-semibold text-slate-800 focus:outline-hidden cursor-pointer text-xs"
              >
                <option value="newest">Newest First ⚡</option>
                <option value="mastery">Highest Mastery</option>
                <option value="concepts">Most Concepts</option>
              </select>
            </div>
          </div>
        </div>

        {/* ─── Deleted Toast ─── */}
        <AnimatePresence>
          {deletedToast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-900 flex items-center justify-between shadow-xs"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span><b>{deletedToast}</b></span>
              </div>
              <span className="text-[11px] text-emerald-600 font-mono">Updated</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Systems Grid ─── */}
        {filteredSystems.length === 0 ? (
          <div className="mt-8 space-y-4">
            <EmptyState
              icon={<Layers className="h-6 w-6 text-indigo-600" />}
              title="Your Library is Empty"
              description={searchQuery ? "Try adjusting your search query or filters." : "Upload materials in Studio or restore demo study sets to get started."}
              actionHref="/upload"
              actionLabel="Launch Studio"
            />
            <div className="text-center">
              <button
                onClick={handleRestoreDemos}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-semibold transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restore Sample Decks</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSystems.map((sys) => (
              <LiquidGlassCard
                key={sys.id}
                depth="medium"
                className="p-6 flex flex-col justify-between border-slate-200/90 bg-white/95 hover:border-slate-300 relative group shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-indigo-600 font-bold">{sys.subject}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[11px] flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-300" />
                        {sys.createdAt}
                      </span>
                      
                      {/* Delete Trigger Button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDeleteConfirmId(deleteConfirmId === sys.id ? null : sys.id);
                        }}
                        title="Delete this study system"
                        className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Inline Delete Confirmation Banner */}
                  <AnimatePresence>
                    {deleteConfirmId === sys.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 p-3 rounded-xl border border-rose-200 bg-rose-50/90 text-rose-900 text-xs overflow-hidden"
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">Delete this system?</p>
                            <p className="text-[11px] text-rose-700 mt-0.5">
                              This will remove quizzes, concept maps, and flashcards.
                            </p>
                            <div className="mt-2.5 flex items-center gap-2">
                              <button
                                onClick={() => handleDelete(sys.id, sys.materialId)}
                                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px] transition-colors"
                              >
                                Yes, Delete
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 rounded-lg bg-white border border-rose-200 text-rose-700 font-medium text-[11px] hover:bg-rose-100/50 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 mt-2.5 leading-snug">
                    {sys.title}
                  </h3>

                  <div className="mt-3.5 flex items-center gap-2 text-xs text-slate-600">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-50 border border-slate-200 flex items-center gap-1 font-mono text-[11px]">
                      <Network className="h-3 w-3 text-indigo-500" />
                      {sys.conceptsCount} Concepts
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-50 border border-slate-200 capitalize font-medium text-[11px]">
                      {sys.level}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-5">
                    <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                      <span>Mastery Retention</span>
                      <span className="font-mono text-emerald-700 font-semibold">{sys.masteryPct}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${sys.masteryPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2">
                  <Link href={`/study/${sys.id}`} className="flex-1">
                    <LiquidGlassButton variant="primary" size="sm" className="w-full" icon={<ArrowRight className="h-3.5 w-3.5" />}>
                      Open Study Hub
                    </LiquidGlassButton>
                  </Link>
                </div>
              </LiquidGlassCard>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
