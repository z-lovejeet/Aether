"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuroraBackground } from "@/components/glass/AuroraBackground";
import { GlassCard } from "@/components/glass/GlassCard";

interface IngestResult {
  cleanedText: string;
  meta: Record<string, unknown>;
  conceptTree?: ConceptNodeRaw[];
}

interface ConceptNodeRaw {
  id: string;
  name: string;
  parentId: string | null;
  difficulty: number;
  terms: string[];
  keyFacts: string[];
}

const DIFF_COLORS = ["#34d399", "#34d399", "#fbbf24", "#fbbf24", "#fb7185"];

function ResultView() {
  const params = useSearchParams();
  const sessionId = params.get("s") ?? "";
  const [data, setData] = useState<IngestResult | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    const raw = sessionStorage.getItem(`ingest:${sessionId}`);
    if (raw) setData(JSON.parse(raw) as IngestResult);
  }, [sessionId]);

  if (!sessionId || !data) {
    return (
      <GlassCard className="max-w-xl p-8 text-center">
        <p>No result found for this session.</p>
        <Link href="/upload" className="mt-4 inline-block text-sm text-[var(--aurora-2)]">
          ← upload something
        </Link>
      </GlassCard>
    );
  }

  const conf = Number(data.meta.ocr_confidence ?? 1);
  const lowConf = conf < 0.6;
  const tree = data.conceptTree ?? [];
  const roots = tree.filter((n) => !n.parentId || !tree.some((p) => p.id === n.parentId));

  function renderNode(node: ConceptNodeRaw, depth: number): React.ReactNode {
    const children = tree.filter((n) => n.parentId === node.id);
    return (
      <div key={node.id} className={depth > 0 ? "mt-2 ml-4 border-l border-white/15 pl-4" : "mt-3"}>
        <GlassCard className="px-4 py-3" interactive={depth === 0}>
          <div className="flex items-center gap-3">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: DIFF_COLORS[node.difficulty - 1] ?? "#fbbf24" }}
            />
            <span className={`font-medium ${depth === 0 ? "font-display text-base" : "text-sm"}`}>
              {node.name}
            </span>
            <span className="ml-auto flex gap-1">
              {(node.terms ?? []).slice(0, 3).map((t) => (
                <span key={t} className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-[var(--text-secondary)]">
                  {t}
                </span>
              ))}
            </span>
          </div>
        </GlassCard>
        {children.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl">
      <h1 className="display text-4xl font-bold">Your study system.</h1>

      {/* stats bar */}
      <div className="mt-4 flex flex-wrap gap-2">
        {("concepts" in data.meta) && (
          <>
            <span className="glass rounded-full px-3 py-1 text-xs text-[var(--text-secondary)]">
              🧩 concepts: <b className="text-white">{String(data.meta.concepts)}</b>
            </span>
            <span className="glass rounded-full px-3 py-1 text-xs text-[var(--text-secondary)]">
              📏 depth: <b className="text-white">{String(data.meta.depth)}</b>
            </span>
            <span className="glass rounded-full px-3 py-1 text-xs text-[var(--text-secondary)]">
              🎯 quizable leaves: <b className="text-white">{String(data.meta.leaves)}</b>
            </span>
          </>
        )}
        {Object.entries(data.meta)
          .filter(([k]) => !["concepts", "depth", "leaves", "degraded_flat"].includes(k))
          .map(([k, v]) => (
            <span key={k} className="glass rounded-full px-3 py-1 text-xs text-[var(--text-secondary)]">
              {k.replace(/_/g, " ")}: <b className="text-white">{String(v)}</b>
            </span>
          ))}
      </div>

      {lowConf && (
        <p className="mt-4 rounded-xl bg-[rgba(251,191,36,0.12)] p-3 text-sm text-[var(--color-learning)]">
          ⚠️ Extraction confidence is low ({conf}) — check the text below for errors.
        </p>
      )}

      {/* concept tree */}
      {tree.length > 0 && (
        <>
          <h2 className="display mt-8 text-xl font-semibold">🧠 Concept map</h2>
          <div className="mt-3">{roots.map((r) => renderNode(r, 0))}</div>
        </>
      )}

      {/* cleaned source text */}
      <details className="mt-8">
        <summary className="cursor-pointer text-sm text-[var(--text-secondary)] hover:text-white">
          Show extracted source text ({data.cleanedText.length} chars)
        </summary>
        <GlassCard className="mt-3 max-h-[40vh] overflow-y-auto p-5">
          <pre className="whitespace-pre-wrap font-body text-sm leading-relaxed">{data.cleanedText}</pre>
        </GlassCard>
      </details>

      <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
        Next up (Phase 4): each concept becomes an explainer, quiz & flashcards.
      </p>
      <Link href="/upload" className="mt-4 block text-center text-sm text-[var(--aurora-2)] hover:underline">
        + add another material
      </Link>
    </div>
  );
}

export default function ResultPage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center px-6 py-16">
      <AuroraBackground />
      <Suspense fallback={<p className="text-sm text-[var(--text-secondary)]">Loading…</p>}>
        <ResultView />
      </Suspense>
    </main>
  );
}
