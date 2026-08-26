"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuroraBackground } from "@/components/glass/AuroraBackground";
import { GlassCard } from "@/components/glass/GlassCard";
import { AgentPipelineIndicator } from "@/components/app/AgentPipelineIndicator";
import { pollRunUntilDone, startRun } from "@/lib/agent-client";

type SourceType = "photo" | "pdf" | "text" | "audio" | "youtube";

const TABS: { id: SourceType; label: string }[] = [
  { id: "photo", label: "📷 Photo" },
  { id: "pdf", label: "📄 PDF / Text" },
  { id: "audio", label: "🎙️ Audio" },
  { id: "youtube", label: "▶ YouTube" },
];

const MAX_BYTES = 15 * 1024 * 1024;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function UploadPage() {
  const router = useRouter();
  const [tab, setTab] = useState<SourceType>("photo");
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("beginner");
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSubj = sessionStorage.getItem("mastery_subject");
      const savedLevel = sessionStorage.getItem("mastery_level");
      if (savedSubj) setSubject(savedSubj);
      if (savedLevel) setLevel(savedLevel);
    }
  }, []);

  async function buildPayload(): Promise<Record<string, unknown>> {
    if (tab === "text") return { type: "text", payload: { text: pastedText } };
    if (tab === "youtube") return { type: "youtube", payload: { url: youtubeUrl } };
    if (!file) throw new Error("Please choose a file first.");
    if (file.size > MAX_BYTES) throw new Error("File too large (max 15 MB).");
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const mime =
      tab === "photo"
        ? file.type || "image/jpeg"
        : ext === "pdf"
          ? "application/pdf"
          : file.type || "text/plain";
    return { type: tab, payload: { dataUrl: await fileToDataUrl(file), name: file.name, mime } };
  }

  async function handleSubmit() {
    setError(null);
    try {
      const rawInput = await buildPayload();
      setBusy(true);
      const sid = crypto.randomUUID();
      setSessionId(sid);

      let learningDNA: Record<string, unknown> = {};
      if (typeof window !== "undefined") {
        const rawDna = sessionStorage.getItem("mastery_dna");
        if (rawDna) {
          try {
            learningDNA = JSON.parse(rawDna);
          } catch {
            /* ignore parse error */
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
        setError(e ? e.message : run.error ?? "Something went wrong — try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  if (busy) {
    return (
      <main className="relative flex min-h-dvh flex-col items-center justify-center gap-10 px-6">
        <AuroraBackground />
        <h2 className="display text-3xl font-semibold">Building your system…</h2>
        <AgentPipelineIndicator sessionId={sessionId} />
        <p className="animate-pulse text-sm text-[var(--text-secondary)]">
          Our agents are reading your material.
        </p>
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh px-6 py-16">
      <AuroraBackground />
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-[var(--text-secondary)] hover:text-white">
          ← back
        </Link>
        <h1 className="display mt-4 text-4xl font-bold">Drop anything in.</h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Your first system is sixty seconds away.
        </p>

        <GlassCard className="mt-8 p-6">
          {/* source tabs */}
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setFile(null); }}
                className={`rounded-full px-4 py-2 text-sm transition-all ${
                  tab === t.id
                    ? "bg-[var(--color-accent)] font-semibold shadow-lg shadow-purple-500/30"
                    : "glass glass-hover text-[var(--text-secondary)]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* input area */}
          <div className="mt-6">
            {tab === "photo" && (
              <DropZone label="Click or drop a photo of your page" icon="📸"
                file={file} onFile={setFile} accept="image/*" fileRef={fileRef} />
            )}
            {tab === "pdf" && (
              <>
                <DropZone label="Choose a PDF or .txt (≤15 MB)" icon="📄"
                  file={file} onFile={(f) => { setFile(f); setPastedText(""); }}
                  accept=".pdf,.txt,text/plain,application/pdf" fileRef={fileRef} />
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="…or paste your notes/text here"
                  rows={5}
                  className="glass mt-4 w-full rounded-2xl p-4 text-sm outline-none placeholder:text-white/30 focus:border focus:border-[var(--color-accent)]"
                />
              </>
            )}
            {tab === "audio" && (
              <DropZone label="Upload a lecture recording or voice memo" icon="🎙️"
                file={file} onFile={setFile} accept="audio/*" fileRef={fileRef} />
            )}
            {tab === "youtube" && (
              <input
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=…"
                className="glass w-full rounded-2xl p-4 text-sm outline-none placeholder:text-white/30 focus:border focus:border-[var(--color-accent)]"
              />
            )}
          </div>

          {/* subject + level */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject (e.g. Biology)"
              className="glass rounded-2xl p-3.5 text-sm outline-none placeholder:text-white/30 focus:border focus:border-[var(--color-accent)]"
            />
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="glass rounded-2xl bg-transparent p-3.5 text-sm text-white outline-none [&>option]:bg-[#141428]"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          {error && (
            <p className="mt-4 rounded-xl bg-[rgba(251,113,133,0.12)] p-3 text-sm text-[var(--color-forget)]">
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={busy}
            className="mt-6 w-full rounded-full bg-[var(--color-accent)] py-3.5 font-display text-sm font-semibold shadow-lg shadow-purple-500/30 transition-transform duration-300 hover:scale-[1.02] active:scale-[0.97] disabled:opacity-50"
          >
            Build my study system →
          </button>
        </GlassCard>
      </div>
    </main>
  );
}

function DropZone({ label, icon, file, onFile, accept, fileRef }: {
  label: string; icon: string; file: File | null;
  onFile: (f: File) => void; accept: string;
  fileRef: React.RefObject<HTMLInputElement | null>;
}) {
  const input = (
    <input ref={fileRef} type="file" accept={accept} hidden
      onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
  );
  return (
    <>
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={async (e) => {
          e.preventDefault();
          if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
        }}
        className="glass glass-hover flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-white/25 py-12"
      >
        <span className="text-3xl">{icon}</span>
        <span className="text-sm">{file ? file.name : label}</span>
      </div>
      {input}
    </>
  );
}
