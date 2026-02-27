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
import type { BuilderNode, BuilderNodeType } from "@shared/types/AiBuilder";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

type CommandEntry = { prompt: string; summary: string };

/** Mark all nodes as included (default from AI response). */
function markIncluded(nodes: BuilderNode[]): BuilderNode[] {
  return nodes.map((n) => ({
    ...n,
    included: true,
    children: markIncluded(n.children ?? []),
  }));
}

/** Toggle a node and cascade to children. */
function toggleNode(nodes: BuilderNode[], tempId: string): BuilderNode[] {
  return nodes.map((n) => {
    if (n.tempId === tempId) {
      const next = !n.included;
      return { ...n, included: next, children: setAll(n.children, next) };
    }
    return { ...n, children: toggleNode(n.children, tempId) };
  });
}

function setAll(nodes: BuilderNode[], val: boolean): BuilderNode[] {
  return nodes.map((n) => ({
    ...n,
    included: val,
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

/** Count included nodes by type. */
function countIncluded(nodes: BuilderNode[]): Record<BuilderNodeType, number> {
  const counts: Record<BuilderNodeType, number> = {
    goal: 0,
    project: 0,
    milestone: 0,
    task: 0,
  };
  function walk(list: BuilderNode[]) {
    for (const n of list) {
      if (n.included) counts[n.type]++;
      walk(n.children);
    }
  }
  walk(nodes);
  return counts;
}

/** Filter tree to only included nodes. */
function filterIncluded(nodes: BuilderNode[]): BuilderNode[] {
  return nodes
    .filter((n) => n.included)
    .map((n) => ({ ...n, children: filterIncluded(n.children) }));
}

// ─────────────────────────────────────────────
// Tree Node component
// ─────────────────────────────────────────────

function TreeNode({
  node,
  depth,
  modeColor,
  onToggle,
  onRename,
  onDateChange,
  onRemove,
}: {
  node: BuilderNode;
  depth: number;
  modeColor: string;
  onToggle: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDateChange: (id: string, date: string | null) => void;
  onRemove: (id: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.title);
  const [showComment, setShowComment] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasChildren = node.children.length > 0;

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  return (
    <div className={clsx(!node.included && "opacity-40")}>
      <div
        className="flex items-center gap-1.5 py-1 group"
        style={{ paddingLeft: depth * 24 }}
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

        {/* Checkbox */}
        <input
          type="checkbox"
          checked={node.included}
          onChange={() => onToggle(node.tempId)}
          className="accent-current flex-shrink-0"
          style={{ accentColor: modeColor }}
        />

        {/* Type icon */}
        {node.type === "goal" ? (
          <span className="flex-shrink-0" style={{ color: modeColor }}>
            <GoalIcon size={16}>
              <GoalTarget />
            </GoalIcon>
          </span>
        ) : node.type === "project" ? (
          <Folder className="w-4 h-4 flex-shrink-0" style={{ color: modeColor }} />
        ) : node.type === "milestone" ? (
          <span
            className="flex-shrink-0"
            style={{
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: `9px solid ${modeColor}`,
            }}
          />
        ) : (
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: modeColor }}
          />
        )}

        {/* Title */}
        {isEditing ? (
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
            className="text-sm cursor-pointer hover:underline truncate flex-1 min-w-0"
            onClick={() => {
              setEditValue(node.title);
              setIsEditing(true);
            }}
            title="Click to rename"
          >
            {node.title}
          </span>
        )}

        {/* Date chip */}
        {node.dueDate ? (
          <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 flex-shrink-0">
            {node.dueDate}
            <button
              onClick={() => onDateChange(node.tempId, null)}
              className="hover:text-red-500"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ) : (
          <button
            className="text-xs text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition flex-shrink-0"
            onClick={() => {
              const val = prompt("Set date (YYYY-MM-DD):");
              if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
                onDateChange(node.tempId, val);
              }
            }}
          >
            + date
          </button>
        )}

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

        {/* Remove */}
        <button
          className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition flex-shrink-0"
          onClick={() => onRemove(node.tempId)}
          title="Remove"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Children */}
      {!collapsed &&
        node.children.map((child) => (
          <TreeNode
            key={child.tempId}
            node={child}
            depth={depth + 1}
            modeColor={modeColor}
            onToggle={onToggle}
            onRename={onRename}
            onDateChange={onDateChange}
            onRemove={onRemove}
          />
        ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main modal
// ─────────────────────────────────────────────

export default function AiBuilderModal({ isOpen, onClose }: Props) {
  const [prompt, setPrompt] = useState("");
  const [nodes, setNodes] = useState<BuilderNode[]>([]);
  const [history, setHistory] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [commandLog, setCommandLog] = useState<CommandEntry[]>([]);
  const [commitSuccess, setCommitSuccess] = useState(false);

  const selectedMode = useModeStore((s) => s.selectedMode);
  const mode = selectedMode === "All" ? null : selectedMode;
  const modeColor = mode?.color || "#6366f1";

  const buildMutation = useAiBuild();
  const commitMutation = useAiCommit();

  const treeRef = useRef<HTMLDivElement>(null);

  const counts = useMemo(() => countIncluded(nodes), [nodes]);
  const totalIncluded =
    counts.goal + counts.project + counts.milestone + counts.task;

  const summaryParts = [
    counts.goal > 0 && `${counts.goal} goal${counts.goal > 1 ? "s" : ""}`,
    counts.project > 0 &&
      `${counts.project} project${counts.project > 1 ? "s" : ""}`,
    counts.milestone > 0 &&
      `${counts.milestone} milestone${counts.milestone > 1 ? "s" : ""}`,
    counts.task > 0 && `${counts.task} task${counts.task > 1 ? "s" : ""}`,
  ]
    .filter(Boolean)
    .join(", ");

  const handleBuild = useCallback(async () => {
    if (!prompt.trim() || !mode) return;

    buildMutation.mutate(
      { prompt: prompt.trim(), modeId: mode.id, history },
      {
        onSuccess: (data) => {
          const markedNodes = markIncluded(data.nodes ?? []);
          setNodes(markedNodes);
          setHistory((h) => [
            ...h,
            { role: "user", content: prompt.trim() },
            { role: "assistant", content: JSON.stringify(data) },
          ]);
          setCommandLog((l) => [
            ...l,
            { prompt: prompt.trim(), summary: data.summary },
          ]);
          setPrompt("");
        },
      }
    );
  }, [prompt, mode, history, buildMutation]);

  const handleCommit = useCallback(async () => {
    if (!mode || totalIncluded === 0) return;

    const included = filterIncluded(nodes);
    commitMutation.mutate(
      { modeId: mode.id, nodes: included },
      {
        onSuccess: () => {
          setCommitSuccess(true);
          setTimeout(() => {
            onClose();
            // Reset state after close animation
            setTimeout(() => {
              setNodes([]);
              setHistory([]);
              setCommandLog([]);
              setCommitSuccess(false);
              setPrompt("");
            }, 200);
          }, 1200);
        },
      }
    );
  }, [mode, nodes, totalIncluded, commitMutation, onClose]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setNodes([]);
      setHistory([]);
      setCommandLog([]);
      setPrompt("");
      setCommitSuccess(false);
    }
  }, [isOpen]);

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
              AI Builder
              {mode && (
                <span
                  className="ml-2 text-sm font-normal"
                  style={{ color: modeColor }}
                >
                  {mode.title}
                </span>
              )}
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
                <span className="mx-1.5 text-gray-300">→</span>
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
          {nodes.length === 0 && !buildMutation.isPending && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
              <Sparkles className="w-8 h-8" />
              <p className="text-sm">
                Describe what you want to build and the AI will generate a plan.
              </p>
            </div>
          )}

          {buildMutation.isPending && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
              <Loader2
                className="w-6 h-6 animate-spin"
                style={{ color: modeColor }}
              />
              <p className="text-sm">Generating...</p>
            </div>
          )}

          {buildMutation.isError && (
            <div className="text-center text-red-500 text-sm py-4">
              Something went wrong. Please try again.
            </div>
          )}

          {!buildMutation.isPending &&
            nodes.map((node) => (
              <TreeNode
                key={node.tempId}
                node={node}
                depth={0}
                modeColor={modeColor}
                onToggle={(id) => setNodes((n) => toggleNode(n, id))}
                onRename={(id, title) =>
                  setNodes((n) => renameNode(n, id, title))
                }
                onDateChange={(id, date) =>
                  setNodes((n) => setNodeDate(n, id, date))
                }
                onRemove={(id) => setNodes((n) => removeNode(n, id))}
              />
            ))}
        </div>

        {/* Input area */}
        <div className="border-t px-5 py-3">
          {!mode && (
            <p className="text-xs text-amber-600 mb-2">
              Select a mode first to use the AI Builder.
            </p>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleBuild();
                }
              }}
              placeholder="Describe what you want to build..."
              disabled={!mode || buildMutation.isPending}
              className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 disabled:opacity-50"
              style={
                { "--tw-ring-color": modeColor } as React.CSSProperties
              }
            />
            <button
              onClick={handleBuild}
              disabled={
                !prompt.trim() || !mode || buildMutation.isPending
              }
              className="px-3 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-40 transition hover:opacity-90"
              style={{ backgroundColor: modeColor }}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Footer — commit */}
        {nodes.length > 0 && (
          <div className="border-t px-5 py-3 flex items-center justify-between bg-gray-50 rounded-b-xl">
            <span className="text-xs text-gray-500">
              {totalIncluded > 0
                ? `Will create ${summaryParts}`
                : "No items selected"}
            </span>
            <button
              onClick={handleCommit}
              disabled={
                totalIncluded === 0 ||
                commitMutation.isPending ||
                commitSuccess
              }
              className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-40 transition hover:opacity-90 flex items-center gap-2"
              style={{ backgroundColor: modeColor }}
            >
              {commitMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : commitSuccess ? (
                "Added!"
              ) : (
                "Add to mode"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
