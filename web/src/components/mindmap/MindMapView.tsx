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
  Sun,
  Moon,
  Layers,
  ZoomIn,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import type {
  MasteryNodeDto,
  MasteryDataDto,
  ConceptNodeDto,
} from "@/lib/agent-client";
import { getMasteryMap } from "@/lib/agent-client";

/* ─── Constants & Dimensions ─────────────────────────────────── */

const NODE_WIDTH = 280;
const NODE_HEIGHT = 115;
const ROOT_WIDTH = 320;
const ROOT_HEIGHT = 125;

/* ─── Themes & Colors (Light & Dark Obsidian) ─────────────────── */

export type CanvasTheme = "light" | "dark";

const MASTERY_STATUS_THEMES = {
  mastered: {
    label: "Mastered",
    color: "#10b981", // Emerald
    lightBg: "#ecfdf5",
    lightText: "#065f46",
    lightBadge: "bg-emerald-100 text-emerald-900 border-emerald-300",
    darkBg: "rgba(16, 185, 129, 0.15)",
    darkText: "#34d399",
    darkBadge: "bg-emerald-950/80 text-emerald-300 border-emerald-800",
  },
  learning: {
    label: "Learning",
    color: "#f59e0b", // Amber
    lightBg: "#fffbeb",
    lightText: "#92400e",
    lightBadge: "bg-amber-100 text-amber-900 border-amber-300",
    darkBg: "rgba(245, 158, 11, 0.15)",
    darkText: "#fbbf24",
    darkBadge: "bg-amber-950/80 text-amber-300 border-amber-800",
  },
  weak: {
    label: "Needs Review",
    color: "#f43f5e", // Rose
    lightBg: "#fff1f2",
    lightText: "#9f1239",
    lightBadge: "bg-rose-100 text-rose-900 border-rose-300",
    darkBg: "rgba(244, 63, 94, 0.15)",
    darkText: "#fb7185",
    darkBadge: "bg-rose-950/80 text-rose-300 border-rose-800",
  },
  new: {
    label: "New Concept",
    color: "#6366f1", // Indigo
    lightBg: "#eef2ff",
    lightText: "#3730a3",
    lightBadge: "bg-indigo-100 text-indigo-900 border-indigo-300",
    darkBg: "rgba(99, 102, 241, 0.15)",
    darkText: "#a5b4fc",
    darkBadge: "bg-indigo-950/80 text-indigo-300 border-indigo-800",
  },
} as const;

type MasteryStatus = keyof typeof MASTERY_STATUS_THEMES;

function getMasteryStatus(m: MasteryDataDto): MasteryStatus {
  if (m.failCount > 0) return "weak";
  if (m.repetitions >= 3) return "mastered";
  if (m.repetitions > 0) return "learning";
  return "new";
}

/* ─── Intelligent Tree Hierarchy Builder ─────────────────────── */

function buildConnectedHierarchy(
  sourceNodes: MasteryNodeDto[],
): { nodes: MasteryNodeDto[]; edges: Array<{ source: string; target: string }> } {
  if (!sourceNodes || sourceNodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  const nodes = [...sourceNodes];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // 1. Identify primary root concept
  let root = nodes.find(
    (n) =>
      !n.parentId &&
      (n.name.toLowerCase().includes("overview") ||
        n.name.toLowerCase().includes("intro") ||
        n.name.toLowerCase().includes("summary") ||
        n.name.toLowerCase().includes("concept")),
  );
  if (!root) root = nodes.find((n) => !n.parentId) || nodes[0];

  const edges: Array<{ source: string; target: string }> = [];

  // 2. Add all existing valid parent-child relationships
  nodes.forEach((n) => {
    if (n.parentId && nodeMap.has(n.parentId) && n.parentId !== n.id) {
      edges.push({ source: n.parentId, target: n.id });
    }
  });

  // 3. Find direct children of root
  const directChildren = nodes.filter((n) => n.parentId === root!.id);

  // 4. Identify orphan nodes (nodes with null parentId or nonexistent parent)
  const orphans = nodes.filter(
    (n) =>
      n.id !== root!.id &&
      (!n.parentId || !nodeMap.has(n.parentId) || n.parentId === n.id),
  );

  // 5. Structure orphans into balanced sub-branches if necessary
  const branchRoots =
    directChildren.length >= 2
      ? directChildren
      : orphans.slice(0, Math.min(3, Math.max(1, Math.floor(orphans.length / 2))));

  orphans.forEach((n) => {
    const isAlreadyConnected = edges.some((e) => e.target === n.id);
    if (!isAlreadyConnected) {
      if (branchRoots.includes(n) || branchRoots.length === 0) {
        // Connect branch root directly to root
        edges.push({ source: root!.id, target: n.id });
      } else {
        // Assign to the most relevant branch or round-robin
        const targetBranch =
          branchRoots.find((b) => {
            const bWords = b.name.toLowerCase().split(/\s+/);
            return bWords.some(
              (w) => w.length > 3 && n.name.toLowerCase().includes(w),
            );
          }) || branchRoots[edges.length % branchRoots.length];

        edges.push({ source: targetBranch.id, target: n.id });
      }
    }
  });

  return { nodes, edges };
}

/* ─── Dagre Graph Auto-Layout ────────────────────────────────── */

function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: "TB" | "LR" = "TB",
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: direction === "TB" ? 60 : 70,
    ranksep: direction === "TB" ? 90 : 100,
  });

  nodes.forEach((n) => {
    const isRoot = n.data?.isRoot;
    const w = isRoot ? ROOT_WIDTH : NODE_WIDTH;
    const h = isRoot ? ROOT_HEIGHT : NODE_HEIGHT;
    g.setNode(n.id, { width: w, height: h });
  });

  edges.forEach((e) => g.setEdge(e.source, e.target));

  dagre.layout(g);

  const layouted = nodes.map((n) => {
    const pos = g.node(n.id);
    const isRoot = n.data?.isRoot;
    const w = isRoot ? ROOT_WIDTH : NODE_WIDTH;
    const h = isRoot ? ROOT_HEIGHT : NODE_HEIGHT;
    return {
      ...n,
      position: { x: pos.x - w / 2, y: pos.y - h / 2 },
    };
  });

  return { nodes: layouted, edges };
}

/* ─── High-Contrast Custom Node Component ────────────────────── */

function MasteryNodeComponent({ data, selected }: NodeProps) {
  const status = (data.masteryStatus ?? "new") as MasteryStatus;
  const theme = MASTERY_STATUS_THEMES[status];
  const isRoot = Boolean(data.isRoot);
  const isHighlighted = Boolean(data.isHighlighted);
  const canvasTheme = (data.canvasTheme ?? "light") as CanvasTheme;
  const isDark = canvasTheme === "dark";

  return (
    <div
      className={`relative rounded-2xl transition-all duration-200 select-none shadow-md ${
        isRoot ? "w-[320px]" : "w-[280px]"
      } ${
        isDark
          ? "bg-slate-900 border-2 text-white"
          : "bg-white border-2 text-slate-900"
      } ${
        selected
          ? isDark
            ? "ring-4 ring-indigo-400 border-indigo-400 shadow-indigo-500/20 scale-[1.03]"
            : "ring-4 ring-indigo-500/30 border-indigo-600 scale-[1.03]"
          : isHighlighted
          ? isDark
            ? "ring-4 ring-amber-400 border-amber-400 scale-[1.02]"
            : "ring-4 ring-amber-400/40 border-amber-500 scale-[1.02]"
          : isDark
          ? "border-slate-700 hover:border-slate-500 hover:shadow-xl"
          : "border-slate-300 hover:border-slate-400 hover:shadow-lg"
      }`}
      style={{
        borderLeftWidth: "6px",
        borderLeftColor: theme.color,
      }}
    >
      {/* 4 Handles for all orientations */}
      <Handle
        type="target"
        position={Position.Top}
        className={`!h-3.5 !w-3.5 !rounded-full !border-2 shadow-sm ${
          isDark
            ? "!bg-slate-300 !border-slate-900"
            : "!bg-slate-800 !border-white"
        }`}
      />
      <Handle
        type="target"
        position={Position.Left}
        className={`!h-3.5 !w-3.5 !rounded-full !border-2 shadow-sm ${
          isDark
            ? "!bg-slate-300 !border-slate-900"
            : "!bg-slate-800 !border-white"
        }`}
      />

      <div className="p-3.5">
        {/* Top Meta Bar */}
        <div className="flex items-center justify-between gap-1.5 mb-1.5">
          <div className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full ring-2 ring-white/80 shadow-xs"
              style={{ background: theme.color }}
            />
            <span
              className={`rounded-md border px-2 py-0.5 text-[10px] font-extrabold tracking-tight uppercase ${
                isDark ? theme.darkBadge : theme.lightBadge
              }`}
            >
              {theme.label}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {isRoot && (
              <span
                className={`rounded px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                  isDark
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-900 text-white"
                }`}
              >
                Core Root
              </span>
            )}
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                isDark
                  ? "bg-slate-800 text-slate-300"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              Diff {data.difficulty || 3}/5
            </span>
          </div>
        </div>

        {/* Node Title (Large, Ultra-Crisp, High-Contrast) */}
        <h4
          className={`text-sm font-extrabold leading-snug line-clamp-2 ${
            isDark ? "text-white" : "text-slate-900"
          }`}
        >
          {data.label as string}
        </h4>

        {/* Key Fact Snippet */}
        {data.keyFact && (
          <p
            className={`mt-1 text-[11px] line-clamp-1 leading-normal font-medium ${
              isDark ? "text-slate-400" : "text-slate-600"
            }`}
          >
            {data.keyFact as string}
          </p>
        )}

        {/* Bottom Footer Stats */}
        <div
          className={`mt-2.5 flex items-center justify-between border-t pt-1.5 text-[10px] font-semibold ${
            isDark
              ? "border-slate-800 text-slate-400"
              : "border-slate-100 text-slate-500"
          }`}
        >
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 opacity-70" />
            <span>
              {Number(data.repetitions ?? 0) === 0
                ? "Unreviewed"
                : `${data.repetitions} review(s)`}
            </span>
          </div>

          {Number(data.failCount ?? 0) > 0 && (
            <span className="flex items-center gap-1 font-bold text-rose-500">
              <AlertTriangle className="h-3 w-3" />
              <span>×{data.failCount} failed</span>
            </span>
          )}
        </div>
      </div>

      {/* Source Handles */}
      <Handle
        type="source"
        position={Position.Bottom}
        className={`!h-3.5 !w-3.5 !rounded-full !border-2 shadow-sm ${
          isDark
            ? "!bg-slate-300 !border-slate-900"
            : "!bg-slate-800 !border-white"
        }`}
      />
      <Handle
        type="source"
        position={Position.Right}
        className={`!h-3.5 !w-3.5 !rounded-full !border-2 shadow-sm ${
          isDark
            ? "!bg-slate-300 !border-slate-900"
            : "!bg-slate-800 !border-white"
        }`}
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

/* ─── Main Mind Map View ────────────────────────────────────── */

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
  const [canvasTheme, setCanvasTheme] = useState<CanvasTheme>("light");
  const [direction, setDirection] = useState<"TB" | "LR">("TB");
  const [isFullscreen, setIsFullscreen] = useState(false);

  /* Fetch live mastery data from backend API */
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

  /* Build connected tree nodes + edges with dagre layout */
  const { layoutNodes, layoutEdges, stats } = useMemo(() => {
    const rawNodes: MasteryNodeDto[] =
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

    const counts = { total: rawNodes.length, mastered: 0, learning: 0, weak: 0, new: 0 };
    const { nodes: connectedNodes, edges: rawEdges } = buildConnectedHierarchy(rawNodes);

    const primaryRootId =
      connectedNodes.find(
        (c) =>
          !c.parentId ||
          c.name.toLowerCase().includes("overview") ||
          c.name.toLowerCase().includes("intro"),
      )?.id || connectedNodes[0]?.id;

    // Build ReactFlow Nodes
    const rfNodes: Node[] = connectedNodes.map((c) => {
      const status = getMasteryStatus(c.mastery);
      counts[status] += 1;

      const matchesSearch =
        searchQuery.trim().length > 0 &&
        c.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = statusFilter === "all" || status === statusFilter;
      const isRoot = c.id === primaryRootId;

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
          isRoot,
          canvasTheme,
          isHighlighted:
            matchesSearch || (statusFilter !== "all" && matchesFilter),
          _raw: c,
        },
        position: { x: 0, y: 0 },
      };
    });

    // Build ReactFlow Edges with Prominent, Visible Lines & Arrowheads
    const isDark = canvasTheme === "dark";
    const edgeColor = isDark ? "#818cf8" : "#334155"; // Bright Indigo in Dark, Deep Slate in Light

    const rfEdges: Edge[] = rawEdges.map((e, idx) => ({
      id: `edge-${e.source}-${e.target}-${idx}`,
      source: e.source,
      target: e.target,
      type: "smoothstep",
      animated: true,
      style: {
        stroke: edgeColor,
        strokeWidth: 3,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 22,
        height: 22,
        color: edgeColor,
      },
    }));

    const result = getLayoutedElements(rfNodes, rfEdges, direction);

    return {
      layoutNodes: result.nodes,
      layoutEdges: result.edges,
      stats: counts,
    };
  }, [masteryData, conceptTree, searchQuery, statusFilter, direction, canvasTheme]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  /* Keep ReactFlow nodes & edges in sync with layout computation */
  useEffect(() => {
    setNodes(layoutNodes);
    setEdges(layoutEdges);
  }, [layoutNodes, layoutEdges, setNodes, setEdges]);

  /* Handle Node Click */
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const raw = node.data?._raw as MasteryNodeDto | undefined;
    if (raw) setSelectedNode(raw);
  }, []);

  /* ── Loading State ────────────────────────────────────────── */
  if (loading && nodes.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white p-14 shadow-sm">
        <div className="h-7 w-7 animate-spin rounded-full border-3 border-slate-900 border-t-transparent" />
        <span className="ml-3 text-sm font-bold text-slate-700">
          Mapping Knowledge Hierarchy & Mastery State…
        </span>
      </div>
    );
  }

  /* ── Empty State Fallback ─────────────────────────────────── */
  if (nodes.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 mb-4 shadow-xs">
          <Brain className="h-7 w-7" />
        </div>
        <h3 className="font-display text-xl font-bold text-slate-900">
          Knowledge Graph Ready
        </h3>
        <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
          Start quizzing to map your active recall retention across concepts.
        </p>
      </div>
    );
  }

  const isDark = canvasTheme === "dark";

  /* ── Filter Buttons Definition ────────────────────────────── */
  const filterButtons = [
    {
      id: "all" as const,
      label: `All (${stats.total})`,
      colorClass: isDark
        ? "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
        : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200",
    },
    {
      id: "weak" as const,
      label: `Needs Work (${stats.weak})`,
      colorClass: isDark
        ? "bg-rose-950/60 text-rose-300 border-rose-800 hover:bg-rose-900/60"
        : "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100",
    },
    {
      id: "learning" as const,
      label: `Learning (${stats.learning})`,
      colorClass: isDark
        ? "bg-amber-950/60 text-amber-300 border-amber-800 hover:bg-amber-900/60"
        : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100",
    },
    {
      id: "mastered" as const,
      label: `Mastered (${stats.mastered})`,
      colorClass: isDark
        ? "bg-emerald-950/60 text-emerald-300 border-emerald-800 hover:bg-emerald-900/60"
        : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100",
    },
  ];

  /* ── Main Render ──────────────────────────────────────────── */
  return (
    <div
      className={`relative space-y-3.5 ${
        isFullscreen
          ? "fixed inset-0 z-50 bg-slate-950 p-6 flex flex-col justify-between overflow-hidden"
          : ""
      }`}
    >
      {/* ── Top Mind Map Toolbar ── */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 shadow-xs transition-colors ${
          isDark
            ? "border-slate-800 bg-slate-900 text-white"
            : "border-slate-200 bg-white text-slate-900"
        }`}
      >
        {/* Left: Search & Filter */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-xs">
            <Search
              className={`absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${
                isDark ? "text-slate-500" : "text-slate-400"
              }`}
            />
            <input
              type="text"
              placeholder="Search concepts in tree…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full rounded-xl border pl-8 pr-3 py-1.5 text-xs transition-all focus:outline-none ${
                isDark
                  ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500"
                  : "bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-slate-900"
              }`}
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
                    ? isDark
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : f.colorClass
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Theme Switcher, Orientation & Fullscreen */}
        <div className="flex items-center gap-2">
          {/* Canvas Theme Toggle (Light / Dark Obsidian) */}
          <button
            onClick={() =>
              setCanvasTheme(canvasTheme === "light" ? "dark" : "light")
            }
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              isDark
                ? "bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700"
                : "bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200"
            }`}
            title="Toggle Mind Map Theme (Light Editorial / Dark Obsidian)"
          >
            {isDark ? (
              <>
                <Sun className="h-3.5 w-3.5 text-amber-400" />
                <span>Light Canvas</span>
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5 text-indigo-600" />
                <span>Dark Obsidian</span>
              </>
            )}
          </button>

          {/* Orientation Toggle */}
          <button
            onClick={() => setDirection(direction === "TB" ? "LR" : "TB")}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              isDark
                ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
            title="Toggle Tree Layout (Top-to-Bottom / Left-to-Right)"
          >
            <Compass className="h-3.5 w-3.5 opacity-70" />
            <span>
              {direction === "TB" ? "Top-to-Bottom" : "Left-to-Right"}
            </span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`flex items-center gap-1 rounded-xl border p-1.5 text-xs font-semibold transition-all cursor-pointer ${
              isDark
                ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Map"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* ── React Flow Canvas Container ── */}
      <div
        className={`relative w-full overflow-hidden rounded-3xl border-2 transition-colors duration-200 shadow-md ${
          isDark
            ? "border-slate-800 bg-[#090e1a]"
            : "border-slate-300 bg-[#f1f5f9]"
        } ${isFullscreen ? "flex-1 min-h-[550px]" : "h-[640px]"}`}
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
          minZoom={0.25}
          maxZoom={2.5}
          proOptions={{ hideAttribution: true }}
        >
          {/* Distinct Grid Pattern */}
          <Background
            variant={BackgroundVariant.Dots}
            color={isDark ? "#334155" : "#64748b"}
            gap={24}
            size={2}
          />

          {/* High-Contrast Controls */}
          <Controls
            className={`!border !shadow-md !rounded-xl overflow-hidden ${
              isDark
                ? "!bg-slate-900 !border-slate-700 [&>button]:!bg-slate-900 [&>button]:!border-slate-700 [&>button]:!text-slate-200 [&>button:hover]:!bg-slate-800"
                : "!bg-white !border-slate-300 [&>button]:!bg-white [&>button]:!border-slate-200 [&>button]:!text-slate-800 [&>button:hover]:!bg-slate-100"
            }`}
            showInteractive={false}
          />

          {/* Polished MiniMap */}
          <MiniMap
            nodeColor={(node) => {
              const s = node.data?.masteryStatus as MasteryStatus | undefined;
              return MASTERY_STATUS_THEMES[s ?? "new"].color;
            }}
            maskColor={
              isDark ? "rgba(15, 23, 42, 0.85)" : "rgba(241, 245, 249, 0.8)"
            }
            className={`!rounded-2xl !border-2 !shadow-lg overflow-hidden ${
              isDark ? "!bg-slate-900 !border-slate-700" : "!bg-white !border-slate-300"
            }`}
          />
        </ReactFlow>

        {/* Floating Legend Overlay */}
        <div
          className={`absolute bottom-4 left-4 z-10 flex flex-wrap items-center gap-3.5 rounded-2xl border-2 px-4 py-2.5 shadow-md backdrop-blur-md ${
            isDark
              ? "border-slate-700 bg-slate-900/95 text-white"
              : "border-slate-300 bg-white/95 text-slate-900"
          }`}
        >
          {(["mastered", "learning", "weak", "new"] as MasteryStatus[]).map(
            (s) => (
              <div key={s} className="flex items-center gap-1.5">
                <span
                  className="h-3 w-3 rounded-full ring-2 ring-white/60 shadow-xs"
                  style={{ background: MASTERY_STATUS_THEMES[s].color }}
                />
                <span className="text-xs font-extrabold capitalize">
                  {MASTERY_STATUS_THEMES[s].label}
                </span>
              </div>
            ),
          )}
        </div>
      </div>

      {/* ── Interactive Selected Node Detail Drawer ── */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className={`rounded-3xl border-2 p-6 shadow-xl ${
              isDark
                ? "border-slate-800 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-900"
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full capitalize border ${
                      isDark
                        ? MASTERY_STATUS_THEMES[
                            getMasteryStatus(selectedNode.mastery)
                          ].darkBadge
                        : MASTERY_STATUS_THEMES[
                            getMasteryStatus(selectedNode.mastery)
                          ].lightBadge
                    }`}
                  >
                    {
                      MASTERY_STATUS_THEMES[
                        getMasteryStatus(selectedNode.mastery)
                      ].label
                    }
                  </span>
                  <span
                    className={`text-xs font-mono font-bold ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    Difficulty {selectedNode.difficulty}/5
                  </span>
                </div>

                <h3 className="font-display text-xl font-bold">
                  {selectedNode.name}
                </h3>
              </div>

              <button
                onClick={() => setSelectedNode(null)}
                className={`rounded-full p-2 transition-colors ${
                  isDark
                    ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                    : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                }`}
                title="Close Inspector"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Description / Knowledge Points */}
            {selectedNode.description && (
              <div
                className={`mt-3 rounded-2xl border p-4 ${
                  isDark
                    ? "bg-slate-800/80 border-slate-700 text-slate-200"
                    : "bg-slate-50 border-slate-200/80 text-slate-700"
                }`}
              >
                <h5
                  className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${
                    isDark ? "text-indigo-400" : "text-slate-400"
                  }`}
                >
                  Core Knowledge Points
                </h5>
                <p className="text-xs leading-relaxed font-medium">
                  {selectedNode.description}
                </p>
              </div>
            )}

            {/* Spaced Repetition Metrics */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div
                className={`rounded-2xl border p-3 text-center ${
                  isDark
                    ? "bg-slate-800/60 border-slate-700"
                    : "bg-slate-50/80 border-slate-100"
                }`}
              >
                <p
                  className={`text-[11px] font-medium ${
                    isDark ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  Status
                </p>
                <p
                  className="mt-1 text-sm font-bold capitalize"
                  style={{
                    color:
                      MASTERY_STATUS_THEMES[
                        getMasteryStatus(selectedNode.mastery)
                      ].color,
                  }}
                >
                  {
                    MASTERY_STATUS_THEMES[
                      getMasteryStatus(selectedNode.mastery)
                    ].label
                  }
                </p>
              </div>

              <div
                className={`rounded-2xl border p-3 text-center ${
                  isDark
                    ? "bg-slate-800/60 border-slate-700"
                    : "bg-slate-50/80 border-slate-100"
                }`}
              >
                <p
                  className={`text-[11px] font-medium ${
                    isDark ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  Ease Factor
                </p>
                <p className="mt-1 text-sm font-extrabold font-mono">
                  {selectedNode.mastery.easeFactor.toFixed(2)}
                </p>
              </div>

              <div
                className={`rounded-2xl border p-3 text-center ${
                  isDark
                    ? "bg-slate-800/60 border-slate-700"
                    : "bg-slate-50/80 border-slate-100"
                }`}
              >
                <p
                  className={`text-[11px] font-medium ${
                    isDark ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  Reviews
                </p>
                <p className="mt-1 text-sm font-extrabold font-mono">
                  {selectedNode.mastery.repetitions}
                </p>
              </div>

              <div
                className={`rounded-2xl border p-3 text-center ${
                  isDark
                    ? "bg-slate-800/60 border-slate-700"
                    : "bg-slate-50/80 border-slate-100"
                }`}
              >
                <p
                  className={`text-[11px] font-medium ${
                    isDark ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  Next Due
                </p>
                <p className="mt-1 text-sm font-extrabold font-mono">
                  {selectedNode.mastery.dueDate
                    ? selectedNode.mastery.dueDate.split("T")[0]
                    : "Ready now"}
                </p>
              </div>
            </div>

            {/* Actions Bar */}
            <div
              className={`mt-4 flex flex-wrap items-center gap-2.5 border-t pt-4 ${
                isDark ? "border-slate-800" : "border-slate-100"
              }`}
            >
              <button
                onClick={() => {
                  setSelectedNode(null);
                  if (isFullscreen) setIsFullscreen(false);
                  onNavigateToQuiz();
                }}
                className={`flex items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-extrabold shadow-sm transition-all cursor-pointer ${
                  isDark
                    ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-500/30"
                    : "bg-slate-900 text-white hover:bg-slate-800"
                }`}
              >
                <Target className="h-4 w-4 text-emerald-400" />
                <span>Quiz This Concept</span>
              </button>

              {selectedNode.mastery.failCount > 0 && (
                <span
                  className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold ${
                    isDark
                      ? "bg-rose-950/70 border-rose-800 text-rose-300"
                      : "bg-rose-50 border-rose-200 text-rose-700"
                  }`}
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                  <span>
                    {selectedNode.mastery.failCount} failed attempt(s)
                  </span>
                </span>
              )}

              {selectedNode.mastery.lastStrategy && (
                <span
                  className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold ${
                    isDark
                      ? "bg-indigo-950/70 border-indigo-800 text-indigo-300"
                      : "bg-indigo-50 border-indigo-200 text-indigo-700"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                  <span>
                    Best Strategy:{" "}
                    {selectedNode.mastery.lastStrategy.replace("_", " ")}
                  </span>
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
