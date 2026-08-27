"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  MarkerType,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";
import dagre from "dagre";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Target,
  AlertTriangle,
  Sparkles,
  X,
  Search,
  Maximize2,
  Minimize2,
  Clock,
  Compass,
} from "lucide-react";
import type {
  MasteryNodeDto,
  MasteryDataDto,
  ConceptNodeDto,
} from "@/lib/agent-client";
import { getMasteryMap } from "@/lib/agent-client";

/* ─── Constants ─────────────────────────────────────────────── */

const NODE_WIDTH = 270;
const NODE_HEIGHT = 105;

const MASTERY_THEMES = {
  mastered: {
    border: "#10b981",
    accentBg: "#ecfdf5",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    text: "#065f46",
    dot: "#10b981",
    label: "Mastered",
  },
  learning: {
    border: "#f59e0b",
    accentBg: "#fffbeb",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    text: "#92400e",
    dot: "#f59e0b",
    label: "Learning",
  },
  weak: {
    border: "#f43f5e",
    accentBg: "#fff1f2",
    badge: "bg-rose-100 text-rose-800 border-rose-200",
    text: "#9f1239",
    dot: "#f43f5e",
    label: "Weak Concept",
  },
  new: {
    border: "#6366f1",
    accentBg: "#eef2ff",
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
    text: "#3730a3",
    dot: "#6366f1",
    label: "New Concept",
  },
} as const;

type MasteryStatus = keyof typeof MASTERY_THEMES;

/* ─── Helpers ───────────────────────────────────────────────── */

function getMasteryStatus(m: MasteryDataDto): MasteryStatus {
  if (m.failCount > 0) return "weak";
  if (m.repetitions >= 3) return "mastered";
  if (m.repetitions > 0) return "learning";
  return "new";
}

/** Use dagre to auto-layout a hierarchical tree graph */
function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: "TB" | "LR" = "TB",
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: direction === "TB" ? 50 : 60,
    ranksep: direction === "TB" ? 80 : 90,
  });

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

/* ─── High-Contrast Custom Node ────────────────────────────── */

function MasteryNodeComponent({ data, selected }: NodeProps) {
  const status = (data.masteryStatus ?? "new") as MasteryStatus;
  const theme = MASTERY_THEMES[status];
  const isRoot = !data.parentId;
  const isHighlighted = Boolean(data.isHighlighted);

  return (
    <div
      className={`relative rounded-2xl bg-white p-4 shadow-sm transition-all duration-150 border-2 select-none ${
        selected
          ? "ring-4 ring-indigo-500/30 shadow-lg border-indigo-600 scale-[1.03]"
          : isHighlighted
          ? "ring-4 ring-amber-400/40 border-amber-500 scale-[1.02]"
          : "border-slate-300 hover:border-slate-400 hover:shadow-md"
      }`}
      style={{
        width: NODE_WIDTH,
        borderLeftWidth: "6px",
        borderLeftColor: theme.border,
      }}
    >
      {/* Top Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !rounded-full !border-2 !border-white !bg-slate-700 shadow-xs"
      />

      {/* Top Meta Bar */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <div className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full ring-2 ring-white"
            style={{ background: theme.dot }}
          />
          <span
            className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-tight uppercase ${theme.badge}`}
          >
            {theme.label}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {isRoot && (
            <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">
              Root
            </span>
          )}
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 font-mono">
            Diff {data.difficulty || 3}/5
          </span>
        </div>
      </div>

      {/* Node Title (Large, Clear, High-Contrast) */}
      <h4 className="text-sm font-extrabold text-slate-900 leading-snug line-clamp-2">
        {data.label as string}
      </h4>

      {/* Key Fact or Subtitle */}
      {data.keyFact && (
        <p className="mt-1 text-[11px] text-slate-600 line-clamp-1 leading-normal">
          {data.keyFact as string}
        </p>
      )}

      {/* Bottom Stats Footer */}
      <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-1.5 text-[10px] text-slate-500 font-medium">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-slate-400" />
          <span>
            {Number(data.repetitions ?? 0) === 0
              ? "Unreviewed"
              : `${data.repetitions} review(s)`}
          </span>
        </div>

        {Number(data.failCount ?? 0) > 0 && (
          <span className="flex items-center gap-1 font-bold text-rose-600">
            <AlertTriangle className="h-3 w-3" />
            <span>×{data.failCount} failed</span>
          </span>
        )}
      </div>

      {/* Bottom Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !rounded-full !border-2 !border-white !bg-slate-700 shadow-xs"
      />
    </div>
  );
}

const nodeTypes = { mastery: MasteryNodeComponent };

/* ─── Component Props ───────────────────────────────────────── */

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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<MasteryStatus | "all">("all");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [direction, setDirection] = useState<"TB" | "LR">("TB");

  /* Fetch live mastery data from API */
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
  const { layoutNodes, layoutEdges, stats } = useMemo(() => {
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

    const counts = { total: source.length, mastered: 0, learning: 0, weak: 0, new: 0 };

    // Identify primary root node
    const primaryRoot = source.find((c) => !c.parentId) || source[0];

    const rfNodes: Node[] = source.map((c) => {
      const status = getMasteryStatus(c.mastery);
      counts[status] += 1;

      const matchesSearch =
        searchQuery.trim().length > 0 &&
        c.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = statusFilter === "all" || status === statusFilter;

      return {
        id: c.id,
        type: "mastery",
        data: {
          label: c.name,
          parentId: c.parentId,
          difficulty: c.difficulty,
          masteryStatus: status,
          failCount: c.mastery.failCount,
          repetitions: c.mastery.repetitions,
          keyFact: c.description ? c.description.split(".")[0] : "",
          isHighlighted: matchesSearch || (statusFilter !== "all" && matchesFilter),
          _raw: c,
        },
        position: { x: 0, y: 0 },
      };
    });

    // Ensure all secondary roots and child nodes connect seamlessly
    const rfEdges: Edge[] = [];
    const nodeIds = new Set(source.map((c) => c.id));

    source.forEach((c) => {
      let parent = c.parentId;
      // Connect disjoint root nodes to primary root for tree structure
      if ((!parent || !nodeIds.has(parent)) && primaryRoot && c.id !== primaryRoot.id) {
        parent = primaryRoot.id;
      }

      if (parent && parent !== c.id && nodeIds.has(parent)) {
        rfEdges.push({
          id: `edge-${parent}-${c.id}`,
          source: parent,
          target: c.id,
          type: "smoothstep",
          animated: true,
          style: {
            stroke: "#475569",
            strokeWidth: 2.5,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 18,
            height: 18,
            color: "#475569",
          },
        });
      }
    });

    const result = getLayoutedElements(rfNodes, rfEdges, direction);
    return {
      layoutNodes: result.nodes,
      layoutEdges: result.edges,
      stats: counts,
    };
  }, [masteryData, conceptTree, searchQuery, statusFilter, direction]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  /* Keep React Flow state updated */
  useEffect(() => {
    setNodes(layoutNodes);
    setEdges(layoutEdges);
  }, [layoutNodes, layoutEdges, setNodes, setEdges]);

  /* Node click handler */
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const raw = node.data?._raw as MasteryNodeDto | undefined;
    if (raw) setSelectedNode(raw);
  }, []);

  /* ── Loading state ────────────────────────────────────────── */
  if (loading && nodes.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white p-14 shadow-sm">
        <div className="h-7 w-7 animate-spin rounded-full border-3 border-slate-900 border-t-transparent" />
        <span className="ml-3 text-sm font-bold text-slate-700">
          Loading Interactive Concept Map…
        </span>
      </div>
    );
  }

  /* ── Empty state fallback ─────────────────────────────────── */
  if (nodes.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 mb-4 shadow-xs">
          <Brain className="h-7 w-7" />
        </div>
        <h3 className="font-display text-xl font-bold text-slate-900">
          Concept Knowledge Graph Ready
        </h3>
        <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
          Start taking quizzes to map your active recall retention and concept connections.
        </p>
      </div>
    );
  }

  /* ── Filter Buttons Definition ────────────────────────────── */
  const filterButtons = [
    { id: "all" as const, label: `All (${stats.total})`, colorClass: "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100" },
    { id: "weak" as const, label: `Weak (${stats.weak})`, colorClass: "text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100" },
    { id: "learning" as const, label: `Learning (${stats.learning})`, colorClass: "text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100" },
    { id: "mastered" as const, label: `Mastered (${stats.mastered})`, colorClass: "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100" },
  ];

  /* ── Main Render ──────────────────────────────────────────── */
  return (
    <div
      className={`relative space-y-3 ${
        isFullscreen
          ? "fixed inset-0 z-50 bg-slate-50 p-6 flex flex-col justify-between overflow-hidden"
          : ""
      }`}
    >
      {/* ── Top Mind Map Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
        {/* Left: Search & Filter */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search concepts in map…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:border-slate-900 focus:outline-none transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-1">
            {filterButtons.map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold border transition-all cursor-pointer ${
                  statusFilter === f.id
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : f.colorClass
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Layout Toggle & Fullscreen */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDirection(direction === "TB" ? "LR" : "TB")}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
            title="Switch Tree Layout Direction"
          >
            <Compass className="h-3.5 w-3.5 text-slate-500" />
            <span>{direction === "TB" ? "Top-to-Bottom" : "Left-to-Right"}</span>
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Map"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* ── React Flow Canvas Container ── */}
      <div
        className={`relative w-full overflow-hidden rounded-3xl border border-slate-300 bg-slate-100/80 shadow-xs ${
          isFullscreen ? "flex-1 min-h-[500px]" : "h-[620px]"
        }`}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={2.5}
          proOptions={{ hideAttribution: true }}
        >
          {/* Crisp Dot Grid Background */}
          <Background
            variant={BackgroundVariant.Dots}
            color="#94a3b8"
            gap={22}
            size={1.5}
          />

          {/* Crisp Clean Controls */}
          <Controls
            className="!bg-white !border !border-slate-300 !shadow-sm !rounded-xl overflow-hidden [&>button]:!bg-white [&>button]:!border-slate-200 [&>button]:!text-slate-800 [&>button:hover]:!bg-slate-100"
            showInteractive={false}
          />

          {/* Clean Light-Themed MiniMap */}
          <MiniMap
            nodeColor={(node) => {
              const s = node.data?.masteryStatus as MasteryStatus | undefined;
              return MASTERY_THEMES[s ?? "new"].border;
            }}
            maskColor="rgba(241, 245, 249, 0.75)"
            className="!bg-white !border !border-slate-300 !rounded-2xl !shadow-md overflow-hidden"
          />
        </ReactFlow>

        {/* Floating Legend Overlay (Editorial Light) */}
        <div className="absolute bottom-4 left-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-300 bg-white/95 px-4 py-2 shadow-sm backdrop-blur-md">
          {(["mastered", "learning", "weak", "new"] as MasteryStatus[]).map(
            (s) => (
              <div key={s} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full ring-2 ring-white shadow-xs"
                  style={{ background: MASTERY_THEMES[s].border }}
                />
                <span className="text-xs font-bold capitalize text-slate-800">
                  {MASTERY_THEMES[s].label}
                </span>
              </div>
            ),
          )}
        </div>
      </div>

      {/* ── Interactive Selected Node Detail Panel ── */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize border ${
                      MASTERY_THEMES[getMasteryStatus(selectedNode.mastery)].badge
                    }`}
                  >
                    {MASTERY_THEMES[getMasteryStatus(selectedNode.mastery)].label}
                  </span>
                  <span className="text-xs text-slate-500 font-mono font-semibold">
                    Difficulty {selectedNode.difficulty}/5
                  </span>
                  {!selectedNode.parentId && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-white uppercase">
                      Primary Root
                    </span>
                  )}
                </div>

                <h3 className="font-display text-xl font-bold text-slate-900">
                  {selectedNode.name}
                </h3>
              </div>

              <button
                onClick={() => setSelectedNode(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                title="Close Inspector"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Description / Key Facts */}
            {selectedNode.description && (
              <div className="mt-3 rounded-2xl bg-slate-50 border border-slate-200/80 p-4">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Core Knowledge Points
                </h5>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {selectedNode.description}
                </p>
              </div>
            )}

            {/* Mastery Spaced Repetition Grid */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-center">
                <p className="text-[11px] text-slate-500 font-medium">Status</p>
                <p
                  className="mt-1 text-sm font-bold capitalize"
                  style={{
                    color:
                      MASTERY_THEMES[getMasteryStatus(selectedNode.mastery)].text,
                  }}
                >
                  {MASTERY_THEMES[getMasteryStatus(selectedNode.mastery)].label}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-center">
                <p className="text-[11px] text-slate-500 font-medium">Ease Factor</p>
                <p className="mt-1 text-sm font-bold text-slate-900 font-mono">
                  {selectedNode.mastery.easeFactor.toFixed(2)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-center">
                <p className="text-[11px] text-slate-500 font-medium">Reviews</p>
                <p className="mt-1 text-sm font-bold text-slate-900 font-mono">
                  {selectedNode.mastery.repetitions}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-center">
                <p className="text-[11px] text-slate-500 font-medium">Next Due</p>
                <p className="mt-1 text-sm font-bold text-slate-900 font-mono">
                  {selectedNode.mastery.dueDate
                    ? selectedNode.mastery.dueDate.split("T")[0]
                    : "Ready now"}
                </p>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="mt-4 flex flex-wrap items-center gap-2.5 border-t border-slate-100 pt-4">
              <button
                onClick={() => {
                  setSelectedNode(null);
                  if (isFullscreen) setIsFullscreen(false);
                  onNavigateToQuiz();
                }}
                className="flex items-center gap-1.5 rounded-full bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition-all cursor-pointer"
              >
                <Target className="h-4 w-4 text-emerald-400" />
                <span>Quiz This Concept</span>
              </button>

              {selectedNode.mastery.failCount > 0 && (
                <span className="flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-3.5 py-2 text-xs text-rose-700 font-semibold">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                  <span>{selectedNode.mastery.failCount} failed attempt(s)</span>
                </span>
              )}

              {selectedNode.mastery.lastStrategy && (
                <span className="flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-3.5 py-2 text-xs text-indigo-700 font-semibold">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Best Strategy: {selectedNode.mastery.lastStrategy.replace("_", " ")}</span>
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
