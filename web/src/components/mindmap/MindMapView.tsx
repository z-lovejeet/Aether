"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";
import dagre from "dagre";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/glass/GlassCard";
import type {
  MasteryNodeDto,
  MasteryDataDto,
  ConceptNodeDto,
} from "@/lib/agent-client";
import { getMasteryMap } from "@/lib/agent-client";

import type { Node, Edge, NodeProps } from "reactflow";

/* ─── Constants ─────────────────────────────────────────────── */

const NODE_WIDTH = 200;
const NODE_HEIGHT = 70;

const MASTERY_COLORS = {
  mastered: { bg: "rgba(52,211,153,0.15)", border: "#34d399", text: "#34d399" },
  learning: { bg: "rgba(251,191,36,0.15)", border: "#fbbf24", text: "#fbbf24" },
  weak: { bg: "rgba(251,113,133,0.15)", border: "#fb7185", text: "#fb7185" },
  new: { bg: "rgba(139,92,246,0.15)", border: "#8b5cf6", text: "#8b5cf6" },
} as const;

type MasteryStatus = keyof typeof MASTERY_COLORS;

/* ─── Helpers ───────────────────────────────────────────────── */

function getMasteryStatus(m: MasteryDataDto): MasteryStatus {
  if (m.failCount > 0) return "weak";
  if (m.repetitions >= 3) return "mastered";
  if (m.repetitions > 0) return "learning";
  return "new";
}

/** Use dagre to auto-layout a hierarchical graph top-to-bottom. */
function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: "TB" | "LR" = "TB",
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 50, ranksep: 80 });

  nodes.forEach((n) =>
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }),
  );
  edges.forEach((e) => g.setEdge(e.source, e.target));

  dagre.layout(g);

  const layouted = nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
    };
  });

  return { nodes: layouted, edges };
}

/* ─── Custom React Flow Node ────────────────────────────────── */

function MasteryNodeComponent({ data }: NodeProps) {
  const status = (data.masteryStatus ?? "new") as MasteryStatus;
  const colors = MASTERY_COLORS[status];

  return (
    <div
      className="rounded-2xl px-4 py-3 text-center shadow-lg backdrop-blur-xl"
      style={{
        background: colors.bg,
        border: `1.5px solid ${colors.border}`,
        minWidth: 180,
        maxWidth: 220,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-white/30 !border-0 !w-2 !h-2"
      />
      <p className="text-xs font-semibold text-white truncate">
        {data.label as string}
      </p>
      <div className="mt-1 flex items-center justify-center gap-1.5">
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: colors.border }}
        />
        <span
          className="text-[10px] capitalize"
          style={{ color: colors.text }}
        >
          {status}
        </span>
        {Number(data.failCount ?? 0) > 0 && (
          <span className="text-[10px] text-rose-400">
            ×{data.failCount as number}
          </span>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-white/30 !border-0 !w-2 !h-2"
      />
    </div>
  );
}

const nodeTypes = { mastery: MasteryNodeComponent };

/* ─── Props ─────────────────────────────────────────────────── */

interface MindMapViewProps {
  materialId: string | undefined;
  conceptTree: ConceptNodeDto[];
  onNavigateToQuiz: () => void;
}

/* ─── Main Component ────────────────────────────────────────── */

export default function MindMapView({
  materialId,
  conceptTree,
  onNavigateToQuiz,
}: MindMapViewProps) {
  const [masteryData, setMasteryData] = useState<MasteryNodeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<MasteryNodeDto | null>(null);

  /* Fetch mastery data from API */
  useEffect(() => {
    if (!materialId) {
      setLoading(false);
      return;
    }
    getMasteryMap(materialId)
      .then((res) => setMasteryData(res.nodes))
      .catch((err) => console.error("Failed to load mastery map:", err))
      .finally(() => setLoading(false));
  }, [materialId]);

  /* Build React Flow nodes + edges with dagre layout */
  const { layoutNodes, layoutEdges } = useMemo(() => {
    /* Use API mastery data if available, else fall back to concept tree */
    const source: MasteryNodeDto[] =
      masteryData.length > 0
        ? masteryData
        : conceptTree.map((c) => ({
            id: c.id,
            name: c.name,
            parentId: c.parentId,
            difficulty: c.difficulty,
            description: "",
            mastery: {
              easeFactor: 2.5,
              intervalDays: 0,
              repetitions: 0,
              dueDate: null,
              failCount: 0,
              lastStrategy: null,
            },
          }));

    const rfNodes: Node[] = source.map((c) => {
      const status = getMasteryStatus(c.mastery);
      return {
        id: c.id,
        type: "mastery",
        data: {
          label: c.name,
          masteryStatus: status,
          failCount: c.mastery.failCount,
          /* Stash full mastery node data for the detail panel */
          _raw: c,
        },
        position: { x: 0, y: 0 }, // will be set by dagre
      };
    });

    const rfEdges: Edge[] = source
      .filter((c) => c.parentId)
      .map((c) => ({
        id: `e-${c.parentId}-${c.id}`,
        source: c.parentId!,
        target: c.id,
        type: "smoothstep",
        style: { stroke: "rgba(255,255,255,0.2)", strokeWidth: 1.5 },
        animated: true,
      }));

    const result = getLayoutedElements(rfNodes, rfEdges);
    return { layoutNodes: result.nodes, layoutEdges: result.edges };
  }, [masteryData, conceptTree]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  /* Keep React Flow state in sync when layout recomputes */
  useEffect(() => {
    setNodes(layoutNodes);
    setEdges(layoutEdges);
  }, [layoutNodes, layoutEdges, setNodes, setEdges]);

  /* Node click → open detail panel */
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const raw = node.data?._raw as MasteryNodeDto | undefined;
    if (raw) setSelectedNode(raw);
  }, []);

  /* ── Loading state ────────────────────────────────────────── */
  if (loading) {
    return (
      <GlassCard className="flex items-center justify-center p-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
        <span className="ml-3 text-sm text-[var(--text-secondary)]">
          Loading mastery map…
        </span>
      </GlassCard>
    );
  }

  /* ── No concepts fallback ─────────────────────────────────── */
  if (nodes.length === 0) {
    return (
      <GlassCard className="p-8 text-center">
        <span className="text-3xl">🧠</span>
        <h3 className="display mt-3 text-xl font-semibold">
          Mind Map Generating
        </h3>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Concept nodes will appear once processing completes.
        </p>
      </GlassCard>
    );
  }

  /* ── Main render ──────────────────────────────────────────── */
  return (
    <div className="relative">
      {/* ── React Flow Canvas ── */}
      <GlassCard className="h-[560px] overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.3}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="rgba(255,255,255,0.04)" gap={24} />
          <Controls
            className="!bg-transparent !border-0 !shadow-none [&>button]:!bg-white/10 [&>button]:!border-white/10 [&>button]:!text-white [&>button]:!rounded-lg"
            showInteractive={false}
          />
          <MiniMap
            nodeColor={(node) => {
              const s = node.data?.masteryStatus as MasteryStatus | undefined;
              return MASTERY_COLORS[s ?? "new"].border;
            }}
            maskColor="rgba(0,0,0,0.7)"
            className="!bg-white/5 !border-white/10 !rounded-xl"
          />
        </ReactFlow>

        {/* Legend overlay */}
        <div className="absolute bottom-4 left-4 z-10 flex gap-3 rounded-xl bg-black/50 px-3 py-2 backdrop-blur-sm">
          {(["mastered", "learning", "weak", "new"] as MasteryStatus[]).map(
            (s) => (
              <div key={s} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: MASTERY_COLORS[s].border }}
                />
                <span className="text-[10px] capitalize text-white/70">
                  {s}
                </span>
              </div>
            ),
          )}
        </div>
      </GlassCard>

      {/* ── Selected Node Detail Panel ── */}
      {selectedNode && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4"
        >
          <GlassCard className="p-5" interactive>
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-white">
                  {selectedNode.name}
                </h3>
                {selectedNode.description && (
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {selectedNode.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-white/40 hover:text-white text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Mastery Stats Grid */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-white/5 p-3 text-center">
                <p className="text-xs text-[var(--text-secondary)]">Status</p>
                <p
                  className="mt-1 text-sm font-semibold capitalize"
                  style={{
                    color:
                      MASTERY_COLORS[getMasteryStatus(selectedNode.mastery)]
                        .border,
                  }}
                >
                  {getMasteryStatus(selectedNode.mastery)}
                </p>
              </div>
              <div className="rounded-xl bg-white/5 p-3 text-center">
                <p className="text-xs text-[var(--text-secondary)]">
                  Ease Factor
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {selectedNode.mastery.easeFactor.toFixed(2)}
                </p>
              </div>
              <div className="rounded-xl bg-white/5 p-3 text-center">
                <p className="text-xs text-[var(--text-secondary)]">Reviews</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {selectedNode.mastery.repetitions}
                </p>
              </div>
              <div className="rounded-xl bg-white/5 p-3 text-center">
                <p className="text-xs text-[var(--text-secondary)]">
                  Next Review
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {selectedNode.mastery.dueDate ?? "—"}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
              <button
                onClick={() => {
                  setSelectedNode(null);
                  onNavigateToQuiz();
                }}
                className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-purple-500/25"
              >
                🎯 Quiz This Concept
              </button>
              {selectedNode.mastery.failCount > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/30 px-3 py-2 text-xs text-rose-300">
                  ⚠️ {selectedNode.mastery.failCount} failed attempts
                </span>
              )}
              {selectedNode.mastery.lastStrategy && (
                <span className="flex items-center gap-1 rounded-full bg-white/5 px-3 py-2 text-xs text-[var(--text-secondary)]">
                  Best strategy: {selectedNode.mastery.lastStrategy.replace("_", " ")}
                </span>
              )}
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}
