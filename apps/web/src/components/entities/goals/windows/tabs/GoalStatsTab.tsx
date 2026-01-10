// apps/web/src/components/entities/goals/windows/tabs/GoalStatsTab.tsx
"use client";

import { useMemo, useEffect } from "react";

import { Goal } from "@shared/types/Goal";
import type { Mode } from "@shared/types/Mode";
import type { StatsTree, StatsNode } from "@shared/types/Stats";
import { getContrastingText } from "@shared/utils/getContrastingText";

import {
  useStatsFilterStore,
  type StatsRange,
} from "@shared/store/useStatsFilterStore";

import { useStatsTree } from "@shared/api/hooks/stats/useStatsTree";

import { fmtDuration } from "@/components/stats/utils/format";
import {
  StatsPieChart,
  type StatsPieSegment,
} from "@/components/stats/charts/StatsPieChart";
import {
  StatsNodeCard,
  type EntityKind,
} from "@/components/stats/cards/StatsNodeCard";

type Props = {
  goal: Goal;
  modes: Mode[]; // parity / future use
  modeColor: string;
};

type ChildRow = {
  kind: EntityKind;
  node: StatsNode;
  parentTitle: string | null;
};

export default function GoalStatsTab({ goal, modeColor }: Props) {
  const { range, setRange } = useStatsFilterStore();
  const from = range.from ?? null;
  const to = range.to ?? null;
  const activePreset = (range.preset ?? "today") as StatsRange["preset"];

  const headerColor = modeColor;
  const headerTextColor = getContrastingText(headerColor);

  // 🔹 Range-filtered stats: what we actually display in this tab
  const {
    data: rangedTree,
    isLoading,
    isError,
    error,
  } = useStatsTree(
    from && to
      ? {
          modeId: goal.modeId,
          from,
          to,
        }
      : null
  );

  const goalNode = useMemo<StatsNode | null>(() => {
    if (!rangedTree) return null;
    return findGoalNode(rangedTree, goal.id);
  }, [rangedTree, goal.id]);

  // 🔹 All-time range: prefer node-level meta, fall back to tree-level meta
  const allTimeRange = useMemo(() => {
    if (goalNode) {
      const nodeRange = extractNodeAllTimeRange(goalNode);
      if (nodeRange) return nodeRange;
    }
    if (rangedTree) {
      return extractAllTimeRange(rangedTree as StatsTree);
    }
    return null;
  }, [goalNode, rangedTree]);

  const totalSeconds = goalNode?.seconds ?? 0;

  // 🔹 Build BOTH: pie segments + list rows from the same subtree
  const { segments, childRows } = useMemo(() => {
    if (!goalNode) {
      return { segments: [] as StatsPieSegment[], childRows: [] as ChildRow[] };
    }

    const segs: StatsPieSegment[] = [];
    const rows: ChildRow[] = [];
    const rootTitle = goalNode.title || null;

    // ✅ Card + segment for work directly on this goal
    const selfSeconds = goalNode.selfSeconds ?? 0;
    if (selfSeconds > 0) {
      segs.push({
        label: goalNode.title || "This goal",
        seconds: selfSeconds,
      });

      rows.push({
        kind: "goal",
        node: {
          ...goalNode,
          seconds: selfSeconds,
          goals: [],
          projects: [],
          milestones: [],
          tasks: [],
        },
        parentTitle: null,
      });
    }

    // 🔁 Recursively walk goals + projects + milestones + tasks under this goal
    const walkChildren = (node: StatsNode, parentTitle: string | null) => {
      // sub-goals (if ever used)
      node.goals?.forEach((g) => {
        const gSelf = g.selfSeconds ?? 0;
        if (gSelf > 0) {
          rows.push({
            kind: "goal",
            node: g,
            parentTitle,
          });

          segs.push({
            label: g.title || "Sub-goal",
            seconds: gSelf,
          });
        }

        const nextParentTitle = g.title || parentTitle;
        walkChildren(g, nextParentTitle);
      });

      // projects
      node.projects?.forEach((p) => {
        const pSelf = p.selfSeconds ?? 0;
        if (pSelf > 0) {
          rows.push({
            kind: "project",
            node: p,
            parentTitle,
          });

          segs.push({
            label: p.title || "Project",
            seconds: pSelf,
          });
        }

        const nextParentTitle = p.title || parentTitle;
        walkChildren(p, nextParentTitle);
      });

      // milestones
      node.milestones?.forEach((m) => {
        const mSelf = m.selfSeconds ?? 0;
        if (mSelf > 0) {
          rows.push({
            kind: "milestone",
            node: m,
            parentTitle,
          });

          segs.push({
            label: m.title || "Milestone",
            seconds: mSelf,
          });
        }

        const nextParentTitle = m.title || parentTitle;
        walkChildren(m, nextParentTitle);
      });

      // tasks (leaves – time is always “direct”)
      node.tasks?.forEach((t) => {
        const tSeconds = t.seconds ?? 0;
        if (tSeconds > 0) {
          rows.push({
            kind: "task",
            node: t,
            parentTitle,
          });

          segs.push({
            label: t.title || "Task",
            seconds: tSeconds,
          });
        }
      });
    };

    // start recursion from this goal
    walkChildren(goalNode, rootTitle);

    // sort by total seconds (desc) for nicer UX
    rows.sort((a, b) => (b.node.seconds ?? 0) - (a.node.seconds ?? 0));

    return { segments: segs, childRows: rows };
  }, [goalNode]);

  /* -------------------------------------------------- */
  /* Handlers                                           */
  /* -------------------------------------------------- */

  function handlePresetChange(preset: StatsRange["preset"]) {
    if (preset === "allTime") {
      if (allTimeRange) {
        setRange({
          from: allTimeRange.from,
          to: allTimeRange.to,
          preset: "allTime",
        });
      } else if (range.from && range.to) {
        setRange({
          from: range.from,
          to: range.to,
          preset: "allTime",
        });
      }
      return;
    }

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
      from: nextFrom!,
      to: nextTo!,
      preset: "custom",
    });
  }

  // 🧹 Reset global stats range when this tab unmounts
  useEffect(() => {
    return () => {
      const reset = computePresetRange("today");
      setRange(reset);
    };
  }, [setRange]);

  /* -------------------------------------------------- */
  /* Render                                             */
  /* -------------------------------------------------- */

  return (
    <div className="h-full overflow-y-auto p-6 space-y-4">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900 pb-3">Stats</h2>

        {/* Range controls (same store as main StatsView) */}
        <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Presets */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {(
                [
                  "today",
                  "thisWeek",
                  "thisMonth",
                  "allTime",
                ] as StatsRange["preset"][]
              ).map((preset) => {
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
                    {preset === "allTime" && "All time"}
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
      </div>

      {/* Loading / error / empty */}
      {isLoading && (
        <div className="space-y-2 mt-2">
          <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
          <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-red-600">
          Failed to load stats: {(error as Error)?.message}
        </p>
      )}

      {!isLoading && !isError && !goalNode && (
        <p className="text-sm text-gray-500">
          No tracked time for this goal in the selected range.
        </p>
      )}

      {!isLoading && !isError && goalNode && totalSeconds > 0 && (
        <>
          {/* Total + pie */}
          <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Total
              </p>
              <p className="text-3xl font-bold">{fmtDuration(totalSeconds)}</p>
            </div>

            <StatsPieChart
              totalSeconds={totalSeconds}
              segments={segments}
              color={modeColor}
            />
          </div>

          {/* Child rows */}
          {childRows.length === 0 ? (
            <p className="text-sm text-gray-500">
              All time is logged directly on this goal. No child items with time
              yet.
            </p>
          ) : (
            <div className="space-y-2">
              {childRows.map((row) => (
                <StatsNodeCard
                  key={`${row.kind}-${row.node.id}-${
                    row.parentTitle ?? "root"
                  }`}
                  kind={row.kind}
                  node={row.node}
                  parentTitle={row.parentTitle || undefined}
                  modeColor={modeColor}
                  canChainUp={false}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* -------------------- helpers -------------------- */

function findGoalNode(tree: StatsTree, goalId: number): StatsNode | null {
  const visit = (node: StatsNode): StatsNode | null => {
    if (node.id === goalId) return node;

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

/* -------------------- range/meta helpers -------------------- */

function toISODate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function getString(obj: unknown, path: string[]): string | undefined {
  let cur: unknown = obj;
  for (const key of path) {
    cur = asRecord(cur)[key];
    if (cur == null) return undefined;
  }
  return typeof cur === "string" ? cur : undefined;
}

// Try to read first/last dates from a specific node (if backend exposes them)
function extractNodeAllTimeRange(
  node: StatsNode
): { from: string; to: string } | null {
  const todayIso = toISODate(new Date());

  const first =
    getString(node, ["firstDate"]) ??
    getString(node, ["earliestDate"]) ??
    getString(node, ["rangeFrom"]) ??
    getString(node, ["from"]) ??
    getString(node, ["meta", "firstDate"]) ??
    getString(node, ["meta", "earliestDate"]) ??
    getString(node, ["meta", "rangeFrom"]) ??
    getString(node, ["meta", "from"]);

  const last =
    getString(node, ["lastDate"]) ??
    getString(node, ["latestDate"]) ??
    getString(node, ["rangeTo"]) ??
    getString(node, ["to"]) ??
    getString(node, ["meta", "lastDate"]) ??
    getString(node, ["meta", "latestDate"]) ??
    getString(node, ["meta", "rangeTo"]) ??
    getString(node, ["meta", "to"]);

  if (!first && !last) return null;

  return {
    from: first ?? todayIso,
    to: last ?? todayIso,
  };
}

function extractAllTimeRange(tree: StatsTree) {
  const todayIso = toISODate(new Date());

  const metaSource = asRecord(tree).meta ?? tree;

  const first =
    getString(metaSource, ["firstDate"]) ??
    getString(metaSource, ["earliestDate"]) ??
    getString(metaSource, ["rangeFrom"]) ??
    getString(metaSource, ["from"]);

  const last =
    getString(metaSource, ["lastDate"]) ??
    getString(metaSource, ["latestDate"]) ??
    getString(metaSource, ["rangeTo"]) ??
    getString(metaSource, ["to"]) ??
    todayIso;

  return {
    from: first ?? todayIso,
    to: last ?? todayIso,
  };
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

  // "thisMonth"
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const from = toISODate(start);
  return { from, to, preset: "thisMonth" };
}
