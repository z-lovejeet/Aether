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
import { Brain, Target, AlertTriangle, Sparkles, X } from "lucide-react";
import { LiquidGlassCard } from "@/components/glass/LiquidGlassCard";
import type {
  MasteryNodeDto,
  MasteryDataDto,
  ConceptNodeDto,
} from "@/lib/agent-client";
import { getMasteryMap } from "@/lib/agent-client";

import type { Node, Edge, NodeProps } from "reactflow";

/* ─── Constants ─────────────────────────────────────────────── */

const NODE_WIDTH = 220;
const NODE_HEIGHT = 75;

const MASTERY_COLORS = {
  mastered: { bg: "#ecfdf5", border: "#10b981", badge: "bg-emerald-100 text-emerald-800", text: "#047857" },
  learning: { bg: "#fffbeb", border: "#f59e0b", badge: "bg-amber-100 text-amber-800", text: "#b45309" },
  weak: { bg: "#fff1f2", border: "#f43f5e", badge: "bg-rose-100 text-rose-800", text: "#be123c" },
  new: { bg: "#f8fafc", border: "#6366f1", badge: "bg-indigo-100 text-indigo-800", text: "#4338ca" },
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
  g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 90 });

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

/* ─── Custom React Flow Node (Editorial Light Theme) ───────── */

function MasteryNodeComponent({ data }: NodeProps) {
  const status = (data.masteryStatus ?? "new") as MasteryStatus;
  const colors = MASTERY_COLORS[status];

  return (
    <div
      className="rounded-2xl px-4 py-3 text-center shadow-xs transition-all duration-150 border bg-white hover:shadow-md cursor-pointer select-none"
      style={{
        borderColor: colors.border,
        borderLeftWidth: "4px",
        minWidth: 190,
        maxWidth: 240,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-slate-400 !border-0 !w-2 !h-2"
      />
      <p className="text-xs font-bold text-slate-900 truncate">
        {data.label as string}
      </p>
      <div className="mt-1.5 flex items-center justify-center gap-1.5">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: colors.border }}
        />
        <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full capitalize ${colors.badge}`}>
          {status}
        </span>
        {Number(data.failCount ?? 0) > 0 && (
          <span className="text-[10px] font-mono text-rose-600 font-bold">
            ×{data.failCount as number}
          </span>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-slate-400 !border-0 !w-2 !h-2"
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
  const [loading, setLoading] = useState(Boolean(materialId));
  const [selectedNode, setSelectedNode] = useState<MasteryNodeDto | null>(null);

  /* Fetch mastery data from API */
  useEffect(() => {
    if (!materialId) {
      setLoading(false);
      return;
    }
    getMasteryMap(materialId)
      .then((res) => {
        if (res?.nodes?.length) setMasteryData(res.nodes);
      })
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
            description: c.keyFacts?.join(". ") || "",
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
          _raw: c,
        },
        position: { x: 0, y: 0 },
      };
    });

    const rfEdges: Edge[] = source
      .filter((c) => c.parentId)
      .map((c) => ({
        id: `e-${c.parentId}-${c.id}`,
        source: c.parentId!,
        target: c.id,
        type: "smoothstep",
        style: { stroke: "#94a3b8", strokeWidth: 2 },
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
  if (loading && nodes.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white p-12 shadow-sm">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
        <span className="ml-3 text-sm font-semibold text-slate-600">
          Loading Concept Knowledge Graph…
        </span>
      </div>
    );
  }

  /* ── No concepts fallback ─────────────────────────────────── */
  if (nodes.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 mb-3 shadow-xs">
          <Brain className="h-6 w-6" />
        </div>
        <h3 className="font-display text-lg font-bold text-slate-900">
          Knowledge Graph Ready
        </h3>
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
          Start taking quizzes to map your active recall retention and concept connections.
        </p>
      </div>
    );
  }

  /* ── Main render ──────────────────────────────────────────── */
  return (
    <div className="relative space-y-4">
      {/* ── React Flow Canvas ── */}
      <div className="relative h-[560px] w-full overflow-hidden rounded-3xl border border-slate-200/90 bg-slate-50/70 shadow-xs">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.3}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#cbd5e1" gap={20} size={1} />
          <Controls
            className="!bg-white !border !border-slate-200 !shadow-xs [&>button]:!bg-white [&>button]:!border-slate-200 [&>button]:!text-slate-700 [&>button]:!rounded-lg"
            showInteractive={false}
          />
          <MiniMap
            nodeColor={(node) => {
              const s = node.data?.masteryStatus as MasteryStatus | undefined;
              return MASTERY_COLORS[s ?? "new"].border;
            }}
            maskColor="rgba(241, 245, 249, 0.7)"
            className="!bg-white !border !border-slate-200 !rounded-xl !shadow-xs"
          />
        </ReactFlow>

        {/* Legend overlay */}
        <div className="absolute bottom-4 left-4 z-10 flex flex-wrap gap-2.5 rounded-2xl border border-slate-200 bg-white/95 px-3.5 py-2 shadow-sm backdrop-blur-md">
          {(["mastered", "learning", "weak", "new"] as MasteryStatus[]).map(
            (s) => (
              <div key={s} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: MASTERY_COLORS[s].border }}
                />
                <span className="text-[11px] font-medium capitalize text-slate-700">
                  {s}
                </span>
              </div>
            ),
          )}
        </div>
      </div>

      {/* ── Selected Node Detail Panel ── */}
      {selectedNode && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${MASTERY_COLORS[getMasteryStatus(selectedNode.mastery)].badge}`}>
                  {getMasteryStatus(selectedNode.mastery)}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  Difficulty {selectedNode.difficulty}/5
                </span>
              </div>
              <h3 className="font-display text-lg font-bold text-slate-900">
                {selectedNode.name}
              </h3>
              {selectedNode.description && (
                <p className="mt-1 text-xs text-slate-600 leading-relaxed max-w-2xl">
                  {selectedNode.description}
                </p>
              )}
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Mastery Stats Grid */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
              <p className="text-[11px] text-slate-500 font-medium">Status</p>
              <p
                className="mt-1 text-xs sm:text-sm font-bold capitalize"
                style={{
                  color: MASTERY_COLORS[getMasteryStatus(selectedNode.mastery)].text,
                }}
              >
                {getMasteryStatus(selectedNode.mastery)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
              <p className="text-[11px] text-slate-500 font-medium">Ease Factor</p>
              <p className="mt-1 text-xs sm:text-sm font-bold text-slate-900 font-mono">
                {selectedNode.mastery.easeFactor.toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
              <p className="text-[11px] text-slate-500 font-medium">Reviews</p>
              <p className="mt-1 text-xs sm:text-sm font-bold text-slate-900 font-mono">
                {selectedNode.mastery.repetitions}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
              <p className="text-[11px] text-slate-500 font-medium">Next Due</p>
              <p className="mt-1 text-xs sm:text-sm font-bold text-slate-900 font-mono">
                {selectedNode.mastery.dueDate ? selectedNode.mastery.dueDate.split("T")[0] : "Ready now"}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <button
              onClick={() => {
                setSelectedNode(null);
                onNavigateToQuiz();
              }}
              className="flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition-all cursor-pointer"
            >
              <Target className="h-3.5 w-3.5" />
              <span>Quiz This Concept</span>
            </button>
            {selectedNode.mastery.failCount > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-3 py-1.5 text-xs text-rose-700 font-medium">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{selectedNode.mastery.failCount} failed attempt(s)</span>
              </span>
            )}
            {selectedNode.mastery.lastStrategy && (
              <span className="flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs text-indigo-700 font-medium">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Strategy: {selectedNode.mastery.lastStrategy.replace("_", " ")}</span>
              </span>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
