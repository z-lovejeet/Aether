"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Camera,
  FileText,
  Mic,
  Video,
  Sparkles,
  ArrowRight,
  AlertCircle,
  X,
} from "lucide-react";
import { LiquidGlassCard } from "@/components/glass/LiquidGlassCard";
import { LiquidGlassButton } from "@/components/glass/LiquidGlassButton";
import { AgentPipelineIndicator } from "@/components/app/AgentPipelineIndicator";
import { startRun, pollRunUntilDone } from "@/lib/agent-client";

type TabId = "photo" | "pdf" | "audio" | "youtube";

const TABS = [
  { id: "pdf" as TabId, label: "PDF / Notes", icon: FileText },
  { id: "photo" as TabId, label: "Photo / Scan", icon: Camera },
  { id: "audio" as TabId, label: "Audio Lecture", icon: Mic },
  { id: "youtube" as TabId, label: "YouTube Video", icon: Video },
];

const SAMPLE_STUDY_SETS = [
  {
    title: "Cellular Respiration & Glycolysis",
    subject: "Biology",
    level: "intermediate",
    text: `Cellular respiration is the biochemical process by which organisms combine oxygen with foodstuff molecules, diverting the chemical energy into life-sustaining activities and discarding carbon dioxide and water as waste. 

Stage 1: Glycolysis occurs in the cytoplasm. A 6-carbon glucose molecule is split into two 3-carbon pyruvate molecules. The process requires an initial investment of 2 ATP molecules, but produces 4 ATP and 2 NADH molecules through substrate-level phosphorylation, resulting in a net gain of 2 ATP.

Stage 2: The Krebs Cycle (Citric Acid Cycle) takes place inside the mitochondrial matrix. Each pyruvate is converted to acetyl-CoA, producing NADH, FADH2, and 2 ATP per glucose.

Stage 3: The Electron Transport Chain (ETC) is located on the inner mitochondrial membrane. Electrons from NADH and FADH2 create a proton gradient across the inner membrane. Protons flow back through ATP Synthase (chemiosmosis), generating approximately 28 to 32 ATP molecules. Oxygen acts as the final electron acceptor, combining with protons to form water.`,
  },
  {
    title: "Dijkstra's Shortest Path Algorithm",
    subject: "Computer Science",
    level: "advanced",
    text: `Dijkstra's algorithm finds the shortest path from a single source vertex to all other vertices in a weighted graph with non-negative edge weights.

Core Mechanism:
1. Initialize distance to source as 0, and all other vertex distances as infinity.
2. Insert all vertices into a min-priority queue keyed by their tentative distances.
3. While the priority queue is not empty, extract the vertex u with minimum distance.
4. For each adjacent vertex v, perform edge relaxation: if dist[u] + weight(u, v) < dist[v], update dist[v] and update v's position in the priority queue.

Time Complexity: Using a Fibonacci heap or binary min-heap, Dijkstra runs in O((V + E) log V) time. If edge weights are negative, Dijkstra fails because greedy vertex finalization assumes paths cannot decrease in length; the Bellman-Ford algorithm must be used instead.`,
  },
  {
    title: "Quantum Superposition & Wave Mechanics",
    subject: "Physics",
    level: "advanced",
    text: `Quantum superposition is a fundamental principle of quantum mechanics stating that any physical system exists in all theoretically possible states simultaneously until it is measured.

Wavefunction (Ψ): Described by the Schrödinger equation, the wavefunction represents the probability amplitude of finding a particle in a particular quantum state.

Born Rule: The probability density of finding a particle at position x is proportional to |Ψ(x)|². 

Measurement Problem: Upon measurement, the wave function undergoes 'wavefunction collapse' (or decoherence in the Many-Worlds interpretation), projecting the continuous state vector onto a single definite eigenvalue of the observable operator.

Quantum Entanglement: When two or more particles interact such that the quantum state of each particle cannot be described independently of the state of the others, even when separated by large distances.`,
  },
];

export default function UploadPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("pdf");
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [subject, setSubject] = useState("Biology");
  const [level, setLevel] = useState("intermediate");
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  function loadSampleSet(sample: typeof SAMPLE_STUDY_SETS[0]) {
    setTab("pdf");
    setSubject(sample.subject);
    setLevel(sample.level);
    setPastedText(sample.text);
    setFile(null);
  }

  async function handleSubmit() {
    setError(null);
    let rawInput: { type: string; payload: unknown } | null = null;

    if (tab === "photo" && file) {
      const b64 = await fileToBase64(file);
      const mime = file.type || "image/jpeg";
      rawInput = {
        type: "photo",
        payload: {
          data_base64: b64,
          base64: b64,
          dataUrl: `data:${mime};base64,${b64}`,
          mime_type: mime,
          mime: mime,
        },
      };
    } else if (tab === "audio" && file) {
      const b64 = await fileToBase64(file);
      const mime = file.type || "audio/mpeg";
      rawInput = {
        type: "audio",
        payload: {
          data_base64: b64,
          base64: b64,
          dataUrl: `data:${mime};base64,${b64}`,
          mime_type: mime,
          mime: mime,
        },
      };
    } else if (tab === "youtube" && youtubeUrl.trim()) {
      rawInput = { type: "youtube", payload: { url: youtubeUrl.trim() } };
    } else if (tab === "pdf") {
      if (file) {
        const b64 = await fileToBase64(file);
        const mime = file.type || "application/pdf";
        rawInput = {
          type: "pdf",
          payload: {
            data_base64: b64,
            base64: b64,
            dataUrl: `data:${mime};base64,${b64}`,
            mime_type: mime,
            mime: mime,
          },
        };
      } else if (pastedText.trim()) {
        rawInput = { type: "text", payload: { text: pastedText.trim() } };
      }
    }

    if (!rawInput) {
      setError("Please select a file, paste notes, or enter a YouTube URL.");
      return;
    }

    const sid = crypto.randomUUID();
    setSessionId(sid);
    setBusy(true);

    try {
      let learningDNA = {};
      if (typeof window !== "undefined") {
        const rawDna = localStorage.getItem("learning_dna");
        if (rawDna) {
          try {
            learningDNA = JSON.parse(rawDna);
          } catch {
            /* ignore */
          }
        }
      }

      const { runId } = await startRun(sid, "upload_material", {
        rawInput,
        subject: subject.trim() || "General",
        level,
        learningDNA,
      });

      const run = await pollRunUntilDone(runId);
      if (run.status === "done" && run.result?.cleanedText) {
        const payloadToSave = {
          cleanedText: run.result.cleanedText,
          conceptTree: run.result.conceptTree ?? [],
          materialId: run.result.materialId ?? (run.result.sourceMeta?.materialId as string | undefined),
          generatedAssets: run.result.generatedAssets ?? {},
          sourceMeta: run.result.sourceMeta ?? {},
          subject: subject.trim() || "General",
          level,
        };
        sessionStorage.setItem(`ingest:${sid}`, JSON.stringify(payloadToSave));
        sessionStorage.setItem(`study:${sid}`, JSON.stringify(payloadToSave));
        router.push(`/study/${sid}`);
      } else {
        const e = run.result?.errors?.[0];
        setError(e ? e.message : run.error ?? "Processing failed — please check the input.");
        setBusy(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  if (busy) {
    return (
      <main className="relative flex min-h-[85vh] flex-col items-center justify-center gap-8 px-4 py-8 text-center">
        {/* Futuristic Ambient Glow Background */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 z-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 text-white text-xs font-mono font-medium shadow-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span>ORCHESTRATING 6-AGENT PIPELINE</span>
            <span className="text-slate-400 font-sans">|</span>
            <span className="text-indigo-300">Groq LPU + Gemini Vision</span>
          </div>

          <h2 className="display text-3xl font-extrabold text-slate-900 sm:text-4xl tracking-tight">
            Synthesizing Your Active Study Hub…
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            Constructing concept DAG, synthesizing LaTeX explainer, generating active recall quizzes, and forging SM-2 flashcard anchors.
          </p>
        </motion.div>

        <div className="w-full z-10">
          <AgentPipelineIndicator sessionId={sessionId} />
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen px-4 pb-24 sm:px-8">
      <div className="mx-auto max-w-3xl pt-4 sm:pt-8">
        {/* Top Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold mb-3">
            <span>Study Studio</span>
          </div>
          <h1 className="display text-3xl sm:text-4xl font-extrabold text-slate-900">
            Upload Your Study Material
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            Convert any document, photo, voice recording, or video into an active study system.
          </p>
        </div>

        {/* 1-Click Sample Previews Banner */}
        <div className="mt-8">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2 px-1">
            Or test with a sample study set:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {SAMPLE_STUDY_SETS.map((s) => (
              <button
                key={s.title}
                onClick={() => loadSampleSet(s)}
                className="liquid-glass rounded-xl p-3.5 text-left border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all duration-150 group"
              >
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span className="font-semibold text-indigo-600">{s.subject}</span>
                  <span className="capitalize">{s.level}</span>
                </div>
                <p className="font-display text-xs font-bold text-slate-900 mt-1">
                  {s.title}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Main Studio Card */}
        <LiquidGlassCard depth="medium" className="mt-6 p-6 sm:p-8 border-slate-200/90 bg-white/95">
          {/* Multimodal Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-slate-100 pb-5">
            {TABS.map((t) => {
              const Icon = t.icon;
              const isSelected = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTab(t.id);
                    setFile(null);
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    isSelected
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Inputs */}
          <div className="mt-6">
            {tab === "photo" && (
              <DropZone
                label="Photograph a textbook page or diagram"
                icon={<Camera className="h-7 w-7 text-slate-400" />}
                file={file}
                onFile={(f) => setFile(f)}
                onClear={() => setFile(null)}
                accept="image/*"
                fileRef={fileRef}
              />
            )}

            {tab === "pdf" && (
              <div className="space-y-3">
                <DropZone
                  label="Upload textbook chapter PDF or slide deck"
                  icon={<FileText className="h-7 w-7 text-slate-400" />}
                  file={file}
                  onFile={(f) => {
                    setFile(f);
                    setPastedText("");
                  }}
                  onClear={() => setFile(null)}
                  accept=".pdf,.txt,text/plain,application/pdf"
                  fileRef={fileRef}
                />
                <div className="relative">
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="…or paste raw textbook text, lecture notes, or enter a study topic directly here"
                    rows={5}
                    className="w-full rounded-2xl p-4 text-xs sm:text-sm text-slate-800 outline-none placeholder:text-slate-400 border border-slate-200/90 bg-slate-50/70 focus:border-slate-400 focus:bg-white transition-all"
                  />
                  {pastedText && (
                    <button
                      onClick={() => setPastedText("")}
                      className="absolute right-3 top-3 text-xs text-slate-400 hover:text-slate-700"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}

            {tab === "audio" && (
              <DropZone
                label="Upload a lecture recording, podcast, or voice memo"
                icon={<Mic className="h-7 w-7 text-slate-400" />}
                file={file}
                onFile={(f) => setFile(f)}
                onClear={() => setFile(null)}
                accept="audio/*"
                fileRef={fileRef}
              />
            )}

            {tab === "youtube" && (
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-slate-700">YouTube Video URL</label>
                <div className="relative">
                  <Video className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=…"
                    className="w-full rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-800 outline-none placeholder:text-slate-400 border border-slate-200/90 bg-slate-50/70 focus:border-slate-400 focus:bg-white"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Our agents will transcribe the video and extract the core concept tree.
                </p>
              </div>
            )}
          </div>

          {/* Subject & Level Customization */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5 border-t border-slate-100 pt-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subject Name
              </label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Biology, Calculus, Economics"
                className="w-full rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-800 outline-none placeholder:text-slate-400 border border-slate-200/90 bg-slate-50/70 focus:border-slate-400 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Level
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-800 outline-none border border-slate-200/90 bg-slate-50/70 focus:border-slate-400 focus:bg-white"
              >
                <option value="beginner">Beginner (Foundational)</option>
                <option value="intermediate">Intermediate (Standard)</option>
                <option value="advanced">Advanced (Deep Rigor)</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="mt-6">
            <LiquidGlassButton
              onClick={handleSubmit}
              size="lg"
              className="w-full"
              icon={<ArrowRight className="h-4 w-4" />}
            >
              Generate Study Hub
            </LiquidGlassButton>
          </div>
        </LiquidGlassCard>
      </div>
    </main>
  );
}

function DropZone({
  label,
  icon,
  file,
  onFile,
  onClear,
  accept,
  fileRef,
}: {
  label: string;
  icon: React.ReactNode;
  file: File | null;
  onFile: (f: File) => void;
  onClear?: () => void;
  accept: string;
  fileRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => {
          if (e.target.files?.[0]) onFile(e.target.files[0]);
          e.target.value = "";
        }}
      />
      <div
        onClick={() => fileRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-150 ${
          file
            ? "border-emerald-400 bg-emerald-50/50"
            : "border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        {file && onClear && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="absolute right-3 top-3 rounded-full bg-white p-1 text-slate-400 hover:text-slate-700 shadow-xs border border-slate-200"
            title="Remove file"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <div className="flex justify-center">{icon}</div>
        <p className="font-display text-xs sm:text-sm font-semibold text-slate-800 mt-2">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {file ? (
            <span className="font-mono text-emerald-700 font-bold">
              ✓ Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </span>
          ) : (
            "Click or drag file here"
          )}
        </p>
      </div>
    </>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const b64 = res.split(",")[1] || "";
      resolve(b64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
