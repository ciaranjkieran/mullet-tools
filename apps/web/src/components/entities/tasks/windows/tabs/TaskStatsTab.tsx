// apps/web/src/components/entities/tasks/windows/tabs/TaskStatsTab.tsx
"use client";

import { useMemo, useEffect, useState } from "react";

import type { Task } from "@shared/types/Task";
import type { Mode } from "@shared/types/Mode";
import type { StatsTree, StatsNode } from "@shared/types/Stats";

import {
  useStatsFilterStore,
  type StatsRange,
} from "@shared/store/useStatsFilterStore";

import { useStatsTree } from "@shared/api/hooks/stats/useStatsTree";
import { useModeMembers } from "@shared/api/hooks/collaboration/useModeMembers";
import { useMe } from "@shared/api/hooks/auth/useMe";
import AssigneeAvatar from "@/components/common/AssigneeAvatar";

import { fmtDuration } from "@/components/stats/utils/format";
import { getContrastingText } from "@shared/utils/getContrastingText";

type Props = {
  task: Task;
  modes: Mode[];
};

export default function TaskStatsTab({ task, modes }: Props) {
  const mode = modes.find((m) => m.id === task.modeId);
  const modeColor = mode?.color ?? "#555";

  const { range, setRange } = useStatsFilterStore();
  const from = range.from ?? null;
  const to = range.to ?? null;
  const activePreset = range.preset ?? "today";

  const headerColor = modeColor;
  const headerTextColor = getContrastingText(headerColor);

  // Collaboration: member filtering
  const { data: meData } = useMe();
  const myUserId = meData?.id ?? null;
  const { data: membersData } = useModeMembers(task.modeId);
  const members = membersData?.members ?? [];
  const isCollaborative = members.length > 1;
  const [selectedMemberId, setSelectedMemberId] = useState<number | "all" | null>(null);

  useEffect(() => {
    setSelectedMemberId(myUserId);
  }, [myUserId]);

  const statsMemberId = useMemo(() => {
    if (!isCollaborative) return undefined;
    if (selectedMemberId === "all") return "all" as const;
    if (selectedMemberId != null && selectedMemberId !== myUserId) return selectedMemberId;
    return undefined;
  }, [isCollaborative, selectedMemberId, myUserId]);

  const {
    data: tree,
    isLoading,
    isError,
    error,
  } = useStatsTree(
    from && to
      ? {
          modeId: task.modeId,
          from,
          to,
          memberId: statsMemberId,
        }
      : null
  );

  const taskNode = useMemo<StatsNode | null>(() => {
    if (!tree) return null;
    return findTaskNode(tree, task.id);
  }, [tree, task.id]);

  const totalSeconds = taskNode?.seconds ?? 0;

  function handlePresetChange(preset: StatsRange["preset"]) {
    const next = computePresetRange(preset);
    setRange(next);
  }

  function handleDateChange(field: "from" | "to", value: string) {
    if (!value) return;

    let nextFrom = range.from;
    let nextTo = range.to;

    if (field === "from") {
      nextFrom = value;
      if (nextTo && nextFrom > nextTo) {
        nextTo = nextFrom;
      }
    } else {
      nextTo = value;
      if (nextFrom && nextTo < nextFrom) {
        nextFrom = nextTo;
      }
    }

    setRange({
      from: nextFrom,
      to: nextTo,
      preset: "custom",
    });
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-4">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900 pb-3">Stats</h2>

        {/* Range controls (mode-coloured) */}
        <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Presets */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {(["today", "thisWeek", "thisMonth"] as const).map((preset) => {
                const isActive = activePreset === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePresetChange(preset)}
                    className="rounded-full border px-3 py-1 text-xs font-medium transition hover:bg-gray-50"
                    style={
                      isActive
                        ? {
                            backgroundColor: headerColor,
                            borderColor: headerColor,
                            color: headerTextColor,
                          }
                        : {
                            backgroundColor: "#FFFFFF",
                            borderColor: "#D1D5DB",
                            color: "#374151",
                          }
                    }
                  >
                    {preset === "today" && "Today"}
                    {preset === "thisWeek" && "This week"}
                    {preset === "thisMonth" && "This month"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom dates */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600">From</span>
            <input
              type="date"
              className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs outline-none hover:border-gray-400"
              value={range.from ?? ""}
              onChange={(e) => handleDateChange("from", e.target.value)}
            />
            <span className="text-xs font-medium text-gray-600">To</span>
            <input
              type="date"
              className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs outline-none hover:border-gray-400"
              value={range.to ?? ""}
              onChange={(e) => handleDateChange("to", e.target.value)}
            />
          </div>
        </div>

        {/* Team member selector (collaborative modes only) */}
        {isCollaborative && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs font-medium text-gray-600">Team</span>
            <div className="flex items-center gap-1.5">
              {members.map((member) => {
                const isSelected = selectedMemberId === member.id;
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setSelectedMemberId(member.id)}
                    className="rounded-full transition"
                    style={{
                      outline: isSelected ? `2px solid ${headerColor}` : "2px solid transparent",
                      outlineOffset: "2px",
                    }}
                    title={member.displayName || member.username}
                  >
                    <AssigneeAvatar assignee={member} size={24} />
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setSelectedMemberId("all")}
                className="rounded-full border px-3 py-1 text-xs font-medium transition hover:bg-gray-50"
                style={
                  selectedMemberId === "all"
                    ? { backgroundColor: headerColor, borderColor: headerColor, color: headerTextColor }
                    : { backgroundColor: "#FFFFFF", borderColor: "#D1D5DB", color: "#374151" }
                }
              >
                Everyone
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Loading / error / empty / content */}
      {isLoading && (
        <div className="space-y-2 mt-2">
          <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-red-600">
          Failed to load stats: {(error as Error)?.message}
        </p>
      )}

      {!isLoading && !isError && (!taskNode || totalSeconds <= 0) && (
        <p className="text-sm text-gray-500">
          No tracked time for this task in the selected range.
        </p>
      )}

      {!isLoading && !isError && taskNode && totalSeconds > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-1">
            Total
          </p>
          <p className="text-3xl font-bold">{fmtDuration(totalSeconds)}</p>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------- */
/* Helper: find this task node inside StatsTree       */
/* -------------------------------------------------- */

function findTaskNode(tree: StatsTree, taskId: number): StatsNode | null {
  const visit = (node: StatsNode): StatsNode | null => {
    if (node.id === taskId) return node;

    if (node.goals) {
      for (const g of node.goals) {
        const found = visit(g);
        if (found) return found;
      }
    }

    if (node.projects) {
      for (const p of node.projects) {
        const found = visit(p);
        if (found) return found;
      }
    }

    if (node.milestones) {
      for (const m of node.milestones) {
        const found = visit(m);
        if (found) return found;
      }
    }

    if (node.tasks) {
      for (const t of node.tasks) {
        const found = visit(t);
        if (found) return found;
      }
    }

    return null;
  };

  const root: StatsNode = {
    id: -1,
    title: "",
    selfSeconds: tree.selfSeconds ?? 0,
    seconds: tree.seconds ?? 0,
    goals: tree.goals ?? [],
    projects: tree.projects ?? [],
    milestones: tree.milestones ?? [],
    tasks: tree.tasks ?? [],
  };

  return visit(root);
}

/* -------------------------------------------------- */
/* Local range helpers (same behaviour as others)     */
/* -------------------------------------------------- */

function toISODate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function computePresetRange(preset: StatsRange["preset"]): StatsRange {
  const today = new Date();
  const to = toISODate(today);

  if (!preset || preset === "today" || preset === "custom") {
    return { from: to, to, preset: "today" };
  }

  if (preset === "thisWeek") {
    const d = new Date(today);
    const jsDay = d.getDay();
    const diff = jsDay === 0 ? 6 : jsDay - 1;
    d.setDate(d.getDate() - diff);
    const from = toISODate(d);
    return { from, to, preset: "thisWeek" };
  }

  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const from = toISODate(start);
  return { from, to, preset: "thisMonth" };
}
