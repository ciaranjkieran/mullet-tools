"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  X,
  Send,
  Sparkles,
  Folder,
  MessageSquare,
  Loader2,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import GoalIcon from "../entities/goals/UI/GoalIcon";
import GoalTarget from "../entities/goals/UI/GoalTarget";
import clsx from "clsx";

import { useAiBuild } from "@shared/api/hooks/ai/useAiBuild";
import { useAiCommit } from "@shared/api/hooks/ai/useAiCommit";
import { useModeStore } from "@shared/store/useModeStore";
import { useTaskStore } from "@shared/store/useTaskStore";
import { useMilestoneStore } from "@shared/store/useMilestoneStore";
import { useProjectStore } from "@shared/store/useProjectStore";
import { useGoalStore } from "@shared/store/useGoalStore";
import type {
  BuilderNode,
  BuilderNodeType,
  BuilderNodeOp,
  ExistingEntity,
} from "@shared/types/AiBuilder";
import type { Mode } from "@shared/types/Mode";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

type CommandEntry = { prompt: string; summary: string };

// ─── Entity snapshot builder ─────────────────
function buildEntitySnapshot(modeId: number): ExistingEntity[] {
  const goals = useGoalStore.getState().goals.filter((g) => g.modeId === modeId);
  const projects = useProjectStore.getState().projects.filter((p) => p.modeId === modeId);
  const milestones = useMilestoneStore.getState().milestones.filter((m) => m.modeId === modeId);
  const tasks = useTaskStore.getState().tasks.filter((t) => t.modeId === modeId);

  const entities: ExistingEntity[] = [];

  for (const g of goals) {
    entities.push({ id: g.id, type: "goal", title: g.title, dueDate: g.dueDate ?? null });
  }
  for (const p of projects) {
    const e: ExistingEntity = { id: p.id, type: "project", title: p.title, dueDate: p.dueDate ?? null };
    if (p.parentId) e.parentId = p.parentId;
    if (p.goalId) e.goalId = p.goalId;
    entities.push(e);
  }
  for (const m of milestones) {
    const e: ExistingEntity = { id: m.id, type: "milestone", title: m.title, dueDate: m.dueDate ?? null };
    if (m.parentId) e.parentId = m.parentId;
    if (m.projectId) e.projectId = m.projectId;
    if (m.goalId) e.goalId = m.goalId;
    entities.push(e);
  }
  for (const t of tasks) {
    const e: ExistingEntity = { id: t.id, type: "task", title: t.title, dueDate: t.dueDate ?? null };
    if (t.milestoneId) e.milestoneId = t.milestoneId;
    if (t.projectId) e.projectId = t.projectId;
    if (t.goalId) e.goalId = t.goalId;
    entities.push(e);
  }

  return entities;
}

/** Summarised snapshot for All-mode: goals + projects only, with modeId. */
function buildAllModeEntitySnapshot(): ExistingEntity[] {
  const modes = useModeStore.getState().modes;
  const modeIds = new Set(modes.map((m) => m.id));
  const goals = useGoalStore.getState().goals.filter((g) => modeIds.has(g.modeId));
  const projects = useProjectStore.getState().projects.filter((p) => modeIds.has(p.modeId));

  const entities: ExistingEntity[] = [];

  for (const g of goals) {
    entities.push({
      id: g.id, type: "goal", title: g.title,
      dueDate: g.dueDate ?? null, modeId: g.modeId,
    });
  }
  for (const p of projects) {
    const e: ExistingEntity = {
      id: p.id, type: "project", title: p.title,
      dueDate: p.dueDate ?? null, modeId: p.modeId,
    };
    if (p.parentId) e.parentId = p.parentId;
    if (p.goalId) e.goalId = p.goalId;
    entities.push(e);
  }

  return entities;
}

// ─── Tree helpers ────────────────────────────

/** Coerce a value to string-or-null safely (prevents objects reaching JSX). */
const str = (v: unknown): string | null =>
  typeof v === "string" ? v : v != null ? String(v) : null;

/** Mark all nodes as included; default `op` to "create" when absent.
 *  Uses a strict whitelist — only known fields are kept so stray objects
 *  from the AI response never reach React rendering (error #300). */
function markIncluded(nodes: unknown): BuilderNode[] {
  if (!Array.isArray(nodes)) return [];
  return nodes.map((n: Record<string, unknown>) => ({
    tempId: str(n.tempId) ?? `tmp_${Math.random().toString(36).slice(2)}`,
    id: typeof n.id === "number" ? n.id : null,
    op: (["create", "update", "delete", "noop"].includes(n.op as string)
      ? (n.op as BuilderNodeOp)
      : "create"),
    type: (["goal", "project", "milestone", "task"].includes(n.type as string)
      ? (n.type as BuilderNodeType)
      : "task"),
    title: str(n.title) || "(untitled)",
    description: str(n.description),
    comment: str(n.comment),
    dueDate: str(n.dueDate),
    parentTempId: str(n.parentTempId),
    children: markIncluded(n.children),
    included: true,
    modeId: typeof n.modeId === "number" ? n.modeId : null,
  }));
}

/** Toggle a node and cascade to children. Skip noop/delete nodes. */
function toggleNode(nodes: BuilderNode[], tempId: string): BuilderNode[] {
  return nodes.map((n) => {
    if (n.tempId === tempId) {
      if (n.op === "noop" || n.op === "delete") return n;
      const next = !n.included;
      return { ...n, included: next, children: setAll(n.children, next) };
    }
    return { ...n, children: toggleNode(n.children, tempId) };
  });
}

function setAll(nodes: BuilderNode[], val: boolean): BuilderNode[] {
  return nodes.map((n) => ({
    ...n,
    included: n.op === "noop" ? true : val,
    children: setAll(n.children, val),
  }));
}

/** Rename a node title. */
function renameNode(
  nodes: BuilderNode[],
  tempId: string,
  title: string
): BuilderNode[] {
  return nodes.map((n) => {
    if (n.tempId === tempId) return { ...n, title };
    return { ...n, children: renameNode(n.children, tempId, title) };
  });
}

/** Set or clear dueDate. */
function setNodeDate(
  nodes: BuilderNode[],
  tempId: string,
  dueDate: string | null
): BuilderNode[] {
  return nodes.map((n) => {
    if (n.tempId === tempId) return { ...n, dueDate };
    return { ...n, children: setNodeDate(n.children, tempId, dueDate) };
  });
}

/** Remove a node from the tree. */
function removeNode(nodes: BuilderNode[], tempId: string): BuilderNode[] {
  return nodes
    .filter((n) => n.tempId !== tempId)
    .map((n) => ({ ...n, children: removeNode(n.children, tempId) }));
}

/** Set modeId on a node and cascade to children. */
function setNodeMode(
  nodes: BuilderNode[],
  tempId: string,
  modeId: number
): BuilderNode[] {
  return nodes.map((n) => {
    if (n.tempId === tempId) {
      return { ...n, modeId, children: setAllMode(n.children, modeId) };
    }
    return { ...n, children: setNodeMode(n.children, tempId, modeId) };
  });
}

function setAllMode(nodes: BuilderNode[], modeId: number): BuilderNode[] {
  return nodes.map((n) => ({
    ...n,
    modeId,
    children: setAllMode(n.children, modeId),
  }));
}

/** Count included nodes by operation. */
function countByOp(nodes: BuilderNode[]): Record<BuilderNodeOp, number> {
  const counts: Record<BuilderNodeOp, number> = {
    create: 0,
    update: 0,
    delete: 0,
    noop: 0,
  };
  function walk(list: BuilderNode[]) {
    for (const n of list) {
      if (n.included && n.op !== "noop") counts[n.op]++;
      walk(n.children);
    }
  }
  walk(nodes);
  return counts;
}

/** Filter tree to only included nodes. Always include noop (needed for parent resolution). */
function filterIncluded(nodes: BuilderNode[]): BuilderNode[] {
  return nodes
    .filter((n) => n.included || n.op === "noop")
    .map((n) => ({ ...n, children: filterIncluded(n.children) }));
}

// ─── Operation badge colors ─────────────────
const OP_STYLES: Record<
  BuilderNodeOp,
  { border: string; badge: string; badgeBg: string; label: string }
> = {
  create: {
    border: "border-l-2 border-green-400",
    badge: "text-green-700",
    badgeBg: "bg-green-100",
    label: "NEW",
  },
  update: {
    border: "border-l-2 border-amber-400",
    badge: "text-amber-700",
    badgeBg: "bg-amber-100",
    label: "EDIT",
  },
  delete: {
    border: "border-l-2 border-red-400",
    badge: "text-red-700",
    badgeBg: "bg-red-100",
    label: "DEL",
  },
  noop: {
    border: "",
    badge: "",
    badgeBg: "",
    label: "",
  },
};

// ─────────────────────────────────────────────
// Tree Node component
// ─────────────────────────────────────────────

function TreeNode({
  node,
  depth,
  modeColor,
  modes,
  isAllMode,
  onToggle,
  onRename,
  onDateChange,
  onRemove,
  onModeChange,
}: {
  node: BuilderNode;
  depth: number;
  modeColor: string;
  modes: Mode[];
  isAllMode: boolean;
  onToggle: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDateChange: (id: string, date: string | null) => void;
  onRemove: (id: string) => void;
  onModeChange: (id: string, modeId: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.title);
  const [showComment, setShowComment] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const modeDropdownRef = useRef<HTMLDivElement>(null);

  // Resolve node-specific mode color in All mode
  const nodeMode = isAllMode && node.modeId
    ? modes.find((m) => m.id === node.modeId)
    : null;
  const nodeColor = nodeMode?.color || modeColor;

  // Close mode dropdown on outside click
  useEffect(() => {
    if (!showModeDropdown) return;
    const handler = (e: MouseEvent) => {
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(e.target as Node)) {
        setShowModeDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showModeDropdown]);

  const hasChildren = node.children.length > 0;
  const op = node.op || "create";
  const style = OP_STYLES[op];
  const isNoop = op === "noop";
  const isDelete = op === "delete";
  const showCheckbox = !isNoop && !isDelete;
  const showRemove = !isNoop;
  const canEdit = !isNoop && !isDelete;

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  return (
    <div>
      <div
        className={clsx(
          "flex items-center gap-1.5 py-1 group",
          style.border,
          isNoop && "opacity-50",
          !isNoop && !node.included && "opacity-40"
        )}
        style={{ paddingLeft: depth * 24 + (style.border ? 0 : 2) }}
      >
        {/* Collapse toggle */}
        <button
          className="w-4 h-4 flex items-center justify-center flex-shrink-0"
          onClick={() => hasChildren && setCollapsed(!collapsed)}
        >
          {hasChildren ? (
            collapsed ? (
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            )
          ) : (
            <span className="w-3.5" />
          )}
        </button>

        {/* Checkbox (hide for noop/delete) */}
        {showCheckbox ? (
          <input
            type="checkbox"
            checked={node.included}
            onChange={() => onToggle(node.tempId)}
            className="accent-current flex-shrink-0"
            style={{ accentColor: modeColor }}
          />
        ) : (
          <span className="w-[13px] flex-shrink-0" />
        )}

        {/* Type icon */}
        {node.type === "goal" ? (
          <span className="flex-shrink-0" style={{ color: nodeColor }}>
            <GoalIcon size={16}>
              <GoalTarget />
            </GoalIcon>
          </span>
        ) : node.type === "project" ? (
          <Folder className="w-4 h-4 flex-shrink-0" style={{ color: nodeColor }} />
        ) : node.type === "milestone" ? (
          <span
            className="flex-shrink-0"
            style={{
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: `9px solid ${nodeColor}`,
            }}
          />
        ) : (
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: nodeColor }}
          />
        )}

        {/* Op badge */}
        {style.label && (
          <span
            className={clsx(
              "text-[10px] font-semibold px-1.5 py-0.5 rounded",
              style.badge,
              style.badgeBg
            )}
          >
            {style.label}
          </span>
        )}

        {/* Mode badge (All mode only) */}
        {isAllMode && nodeMode && (
          <div className="relative flex-shrink-0" ref={modeDropdownRef}>
            <button
              onClick={() => setShowModeDropdown(!showModeDropdown)}
              className="text-[10px] font-medium px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80 transition"
              style={{ backgroundColor: nodeMode.color + "20", color: nodeMode.color }}
            >
              {nodeMode.title}
            </button>
            {showModeDropdown && (
              <div className="absolute z-[200] top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px]">
                {modes.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      onModeChange(node.tempId, m.id);
                      setShowModeDropdown(false);
                    }}
                    className={clsx(
                      "w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-gray-50",
                      m.id === node.modeId && "font-semibold"
                    )}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: m.color }}
                    />
                    {m.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Title */}
        {canEdit && isEditing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => {
              onRename(node.tempId, editValue.trim() || node.title);
              setIsEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onRename(node.tempId, editValue.trim() || node.title);
                setIsEditing(false);
              }
              if (e.key === "Escape") {
                setEditValue(node.title);
                setIsEditing(false);
              }
            }}
            className="text-sm border-b border-gray-300 outline-none bg-transparent px-0.5 flex-1 min-w-0"
          />
        ) : (
          <span
            className={clsx(
              "text-sm truncate flex-1 min-w-0",
              canEdit && "cursor-pointer hover:underline",
              isDelete && "line-through text-red-600",
              isNoop && "text-gray-500"
            )}
            onClick={() => {
              if (!canEdit) return;
              setEditValue(node.title);
              setIsEditing(true);
            }}
            title={canEdit ? "Click to rename" : undefined}
          >
            {node.title}
          </span>
        )}

        {/* Date chip */}
        {!isNoop && node.dueDate ? (
          <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 flex-shrink-0">
            {node.dueDate}
            {canEdit && (
              <button
                onClick={() => onDateChange(node.tempId, null)}
                className="hover:text-red-500"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ) : canEdit ? (
          <button
            className="text-xs text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition flex-shrink-0"
            onClick={() => {
              const val = window.prompt("Set date (YYYY-MM-DD):");
              if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
                onDateChange(node.tempId, val);
              }
            }}
          >
            + date
          </button>
        ) : null}

        {/* Comment tooltip */}
        {node.comment && (
          <div className="relative flex-shrink-0">
            <button
              onMouseEnter={() => setShowComment(true)}
              onMouseLeave={() => setShowComment(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
            {showComment && (
              <div className="absolute z-[200] top-full right-0 mt-1 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg pointer-events-none">
                {node.comment}
              </div>
            )}
          </div>
        )}

        {/* Remove (hide for noop) */}
        {showRemove && (
          <button
            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition flex-shrink-0"
            onClick={() => onRemove(node.tempId)}
            title="Remove"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Children */}
      {!collapsed &&
        node.children.map((child) => (
          <TreeNode
            key={child.tempId}
            node={child}
            depth={depth + 1}
            modeColor={modeColor}
            modes={modes}
            isAllMode={isAllMode}
            onToggle={onToggle}
            onRename={onRename}
            onDateChange={onDateChange}
            onRemove={onRemove}
            onModeChange={onModeChange}
          />
        ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Building animation (matches mobile)
// ─────────────────────────────────────────────

const BUILD_PHASES = [
  "Understanding your request...",
  "Analysing structure...",
  "Structuring changes...",
  "Finalizing plan...",
];

function BuildingIndicator({
  modeColor,
  streamingText,
}: {
  modeColor: string;
  streamingText?: string;
}) {
  const [phase, setPhase] = useState(0);
  const [activeIcon, setActiveIcon] = useState(0);

  useEffect(() => {
    const phaseInterval = setInterval(
      () => setPhase((p) => (p + 1) % BUILD_PHASES.length),
      3000
    );
    const iconInterval = setInterval(
      () => setActiveIcon((i) => (i + 1) % 4),
      600
    );
    return () => {
      clearInterval(phaseInterval);
      clearInterval(iconInterval);
    };
  }, []);

  const icons = [
    <svg key="goal" width={20} height={20} viewBox="0 0 24 24" style={{ color: modeColor }}><GoalTarget /></svg>,
    <Folder key="project" size={20} style={{ color: modeColor }} />,
    <span
      key="milestone"
      style={{
        display: "inline-block",
        width: 0,
        height: 0,
        borderLeft: "8px solid transparent",
        borderRight: "8px solid transparent",
        borderBottom: `14px solid ${modeColor}`,
      }}
    />,
    <svg key="task" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={modeColor} strokeWidth={2}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 12l2 2 4-4" />
    </svg>,
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
      <div
        className="flex items-center justify-center gap-4 rounded-xl px-6 py-4"
        style={{ backgroundColor: modeColor + "08", border: `1px solid ${modeColor}20` }}
      >
        {icons.map((icon, i) => (
          <div
            key={i}
            className="transition-all duration-300"
            style={{
              opacity: i === activeIcon ? 1 : 0.3,
              transform: i === activeIcon ? "scale(1.3)" : "scale(0.85)",
            }}
          >
            {icon}
          </div>
        ))}
      </div>
      <p
        className="text-sm font-medium transition-opacity duration-150"
        style={{ color: "#6b7280" }}
      >
        {BUILD_PHASES[phase]}
      </p>
      {streamingText && (
        <pre className="mt-2 text-xs text-gray-400 max-h-32 overflow-y-auto w-full px-4 whitespace-pre-wrap break-words font-mono">
          {streamingText}
        </pre>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main modal
// ─────────────────────────────────────────────

export default function AiBuilderModal({ isOpen, onClose }: Props) {
  const [prompt, setPrompt] = useState("");
  const [nodes, setNodes] = useState<BuilderNode[]>([]);
  const [commandLog, setCommandLog] = useState<CommandEntry[]>([]);
  const [commitSuccess, setCommitSuccess] = useState(false);

  const selectedMode = useModeStore((s) => s.selectedMode);
  const allModes = useModeStore((s) => s.modes);
  const isAllMode = selectedMode === "All";
  const mode = isAllMode ? null : selectedMode;
  const modeColor = mode?.color || "#6366f1";

  const { build, streamingText, isPending: buildPending, isError: buildError, abort: abortBuild } = useAiBuild();
  const commitMutation = useAiCommit();

  const treeRef = useRef<HTMLDivElement>(null);

  const opCounts = useMemo(() => countByOp(nodes), [nodes]);
  const totalActionable = opCounts.create + opCounts.update + opCounts.delete;

  const summaryParts = [
    opCounts.create > 0 && `create ${opCounts.create}`,
    opCounts.update > 0 && `update ${opCounts.update}`,
    opCounts.delete > 0 && `remove ${opCounts.delete}`,
  ]
    .filter(Boolean)
    .join(", ");

  const isMixed = [opCounts.create, opCounts.update, opCounts.delete].filter(
    (c) => c > 0
  ).length > 1;
  const isPureCreate =
    opCounts.create > 0 && opCounts.update === 0 && opCounts.delete === 0;

  const handleBuild = useCallback(async () => {
    if (!prompt.trim() || (!mode && !isAllMode)) return;

    const entities = isAllMode
      ? buildAllModeEntitySnapshot()
      : buildEntitySnapshot(mode!.id);
    const currentPrompt = prompt.trim();

    const payload: Parameters<typeof build>[0] = {
      prompt: currentPrompt,
      modeId: isAllMode ? "all" : mode!.id,
      currentNodes: nodes.length > 0 ? nodes : undefined,
      entities,
    };

    if (isAllMode) {
      payload.modes = allModes.map((m) => ({ id: m.id, title: m.title, color: m.color }));
    }

    build(payload, (data) => {
      const markedNodes = markIncluded(data.nodes);
      setNodes(markedNodes);
      setCommandLog((l) => [
        ...l,
        {
          prompt: currentPrompt,
          summary:
            typeof data.summary === "string"
              ? data.summary
              : JSON.stringify(data.summary ?? ""),
        },
      ]);
      setPrompt("");
    });
  }, [prompt, mode, isAllMode, allModes, nodes, build]);

  const handleCommit = useCallback(async () => {
    if ((!mode && !isAllMode) || totalActionable === 0) return;

    const included = filterIncluded(nodes);
    commitMutation.mutate(
      { modeId: isAllMode ? "all" : mode!.id, nodes: included },
      {
        onSuccess: () => {
          setCommitSuccess(true);
          setTimeout(() => {
            onClose();
            // Reset state after close animation
            setTimeout(() => {
              setNodes([]);
              setCommandLog([]);
              setCommitSuccess(false);
              setPrompt("");
            }, 200);
          }, 1200);
        },
      }
    );
  }, [mode, isAllMode, nodes, totalActionable, commitMutation, onClose]);

  // Reset on open, abort stream on close
  useEffect(() => {
    if (isOpen) {
      setNodes([]);
      setCommandLog([]);
      setPrompt("");
      setCommitSuccess(false);
    } else {
      abortBuild();
    }
  }, [isOpen, abortBuild]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col mx-4">
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 rounded-t-xl"
          style={{ backgroundColor: modeColor + "12" }}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color: modeColor }} />
            <h2 className="font-semibold text-gray-900">
              AI Assistant
              {isAllMode ? (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  All Modes
                </span>
              ) : mode ? (
                <span
                  className="ml-2 text-sm font-normal"
                  style={{ color: modeColor }}
                >
                  {mode.title}
                </span>
              ) : null}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-black/10 transition"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Command log */}
        {commandLog.length > 0 && (
          <div className="px-5 py-2 border-b bg-gray-50 max-h-24 overflow-y-auto">
            {commandLog.map((entry, i) => (
              <div key={i} className="text-xs py-0.5">
                <span className="text-gray-500">You:</span>{" "}
                <span className="text-gray-700">{entry.prompt}</span>
                <span className="mx-1.5 text-gray-300">&rarr;</span>
                <span className="text-gray-500 italic">{entry.summary}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tree area */}
        <div
          ref={treeRef}
          className="flex-1 overflow-y-auto px-5 py-3 min-h-[200px]"
        >
          {nodes.length === 0 && !buildPending && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
              <Sparkles className="w-8 h-8" />
              <p className="text-sm">
                Describe what you want to build or change and the AI will
                generate a plan.
              </p>
            </div>
          )}

          {buildPending && (
            <BuildingIndicator modeColor={modeColor} streamingText={streamingText} />
          )}

          {buildError && (
            <div className="text-center text-red-500 text-sm py-4">
              Something went wrong. Please try again.
            </div>
          )}

          {!buildPending &&
            nodes.map((node) => (
              <TreeNode
                key={node.tempId}
                node={node}
                depth={0}
                modeColor={modeColor}
                modes={allModes}
                isAllMode={isAllMode}
                onToggle={(id) => setNodes((n) => toggleNode(n, id))}
                onRename={(id, title) =>
                  setNodes((n) => renameNode(n, id, title))
                }
                onDateChange={(id, date) =>
                  setNodes((n) => setNodeDate(n, id, date))
                }
                onRemove={(id) => setNodes((n) => removeNode(n, id))}
                onModeChange={(id, modeId) =>
                  setNodes((n) => setNodeMode(n, id, modeId))
                }
              />
            ))}
        </div>

        {/* Input area */}
        <div className="border-t px-5 py-3">
          <div className="flex gap-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.metaKey) {
                  e.preventDefault();
                  handleBuild();
                }
              }}
              placeholder={isAllMode
                ? "Describe your plans and the AI will sort them into your modes... (⌘+Enter to send)"
                : "Describe what you want to build or change... (⌘+Enter to send)"
              }
              disabled={buildPending}
              rows={2}
              className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 disabled:opacity-50 resize-none"
              style={
                { "--tw-ring-color": modeColor } as React.CSSProperties
              }
            />
            <button
              onClick={handleBuild}
              disabled={!prompt.trim() || buildPending}
              className="px-3 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-40 transition hover:opacity-90"
              style={{ backgroundColor: modeColor }}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Footer -- commit */}
        {nodes.length > 0 && (
          <div className="border-t px-5 py-3 flex items-center justify-between bg-gray-50 rounded-b-xl">
            <span className="text-xs text-gray-500">
              {totalActionable > 0
                ? `Will ${summaryParts}`
                : "No items selected"}
            </span>
            <button
              onClick={handleCommit}
              disabled={
                totalActionable === 0 ||
                commitMutation.isPending ||
                commitSuccess
              }
              className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-40 transition hover:opacity-90 flex items-center gap-2"
              style={{ backgroundColor: modeColor }}
            >
              {commitMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Applying...
                </>
              ) : commitSuccess ? (
                "Done!"
              ) : isPureCreate ? (
                "Add"
              ) : (
                "Apply changes"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
