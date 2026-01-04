// apps/web/src/components/entities/milestones/windows/tabs/MilestoneStatsTab.tsx
"use client";

import { useMemo, useEffect } from "react";

import { Milestone } from "@shared/types/Milestone";
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
  milestone: Milestone;
  modes: Mode[]; // kept for parity / future use
  modeColor: string;
};

type ChildRow = {
  kind: EntityKind;
  node: StatsNode;
  parentTitle: string | null;
};

export default function MilestoneStatsTab({ milestone, modeColor }: Props) {
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
          modeId: milestone.modeId,
          from,
          to,
        }
      : null
  );

  const milestoneNode = useMemo<StatsNode | null>(() => {
    if (!rangedTree) return null;
    return findMilestoneNode(rangedTree, milestone.id);
  }, [rangedTree, milestone.id]);

  // 🔹 All-time range: prefer node-level meta, fall back to tree-level meta
  const allTimeRange = useMemo(() => {
    if (milestoneNode) {
      const nodeRange = extractNodeAllTimeRange(milestoneNode);
      if (nodeRange) return nodeRange;
    }
    if (rangedTree) {
      return extractAllTimeRange(rangedTree as StatsTree);
    }
    return null;
  }, [milestoneNode, rangedTree]);

  const totalSeconds = milestoneNode?.seconds ?? 0;

  // 🔹 Build BOTH: pie segments + list rows from the same subtree
  const { segments, childRows } = useMemo(() => {
    if (!milestoneNode) {
      return { segments: [] as StatsPieSegment[], childRows: [] as ChildRow[] };
    }

    const segs: StatsPieSegment[] = [];
    const rows: ChildRow[] = [];
    const rootTitle = milestoneNode.title || null;

    // ✅ Card + segment for work *directly* on this milestone
    const selfSeconds = milestoneNode.selfSeconds ?? 0;
    if (selfSeconds > 0) {
      segs.push({
        label: milestoneNode.title || "This milestone",
        seconds: selfSeconds,
      });

      rows.push({
        kind: "milestone",
        node: {
          ...milestoneNode,
          seconds: selfSeconds,
          goals: [],
          projects: [],
          milestones: [],
          tasks: [],
        },
        parentTitle: null,
      });
    }

    // 🔁 Recursively walk all nested milestones + tasks
    const walkChildren = (node: StatsNode, parentTitle: string | null) => {
      // sub-milestones at this level
      node.milestones?.forEach((m) => {
        const mSelf = m.selfSeconds ?? 0;

        // 🔸 Only show a card if this milestone has direct time
        if (mSelf > 0) {
          rows.push({
            kind: "milestone",
            node: m,
            parentTitle,
          });

          segs.push({
            label: m.title || "Sub-milestone",
            seconds: mSelf,
          });
        }

        const nextParentTitle = m.title || parentTitle;
        // Still recurse so deeper children with time can appear
        walkChildren(m, nextParentTitle);
      });

      // tasks at this level (leaves – time is direct)
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

    // start recursion from the milestone itself
    walkChildren(milestoneNode, rootTitle);

    // sort list by total seconds (desc) for nicer UX
    rows.sort((a, b) => (b.node.seconds ?? 0) - (a.node.seconds ?? 0));

    return { segments: segs, childRows: rows };
  }, [milestoneNode]);

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

        {/* 🔸 Inline range controls (same store as main StatsView) */}
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

      {/* Loading / error / empty states */}
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

      {!isLoading && !isError && !milestoneNode && (
        <p className="text-sm text-gray-500">
          No tracked time for this milestone in the selected range.
        </p>
      )}

      {!isLoading && !isError && milestoneNode && totalSeconds > 0 && (
        <>
          {/* Total + pie breakdown */}
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

          {/* Child rows: self + full subtree of sub-milestones + tasks */}
          {childRows.length === 0 ? (
            <p className="text-sm text-gray-500">
              All time is logged directly on this milestone. No child items with
              time yet.
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

/* -------------------------------------------------- */
/* Helper: find this milestone node inside StatsTree  */
/* -------------------------------------------------- */

function findMilestoneNode(
  tree: StatsTree,
  milestoneId: number
): StatsNode | null {
  const visit = (node: StatsNode): StatsNode | null => {
    if (node.id === milestoneId) return node;

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
/* Local range helpers                                */
/* -------------------------------------------------- */

function toISODate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Try to read first/last dates from a specific node (if backend exposes them)
function extractNodeAllTimeRange(
  node: StatsNode
): { from: string; to: string } | null {
  const todayIso = toISODate(new Date());
  const anyNode: any = node as any;

  const first: string | undefined =
    anyNode.firstDate ||
    anyNode.earliestDate ||
    anyNode.rangeFrom ||
    anyNode.from ||
    anyNode.meta?.firstDate ||
    anyNode.meta?.earliestDate ||
    anyNode.meta?.rangeFrom ||
    anyNode.meta?.from ||
    undefined;

  const last: string | undefined =
    anyNode.lastDate ||
    anyNode.latestDate ||
    anyNode.rangeTo ||
    anyNode.to ||
    anyNode.meta?.lastDate ||
    anyNode.meta?.latestDate ||
    anyNode.meta?.rangeTo ||
    anyNode.meta?.to ||
    undefined;

  if (!first && !last) return null;

  return {
    from: first ?? todayIso,
    to: last ?? todayIso,
  };
}

function extractAllTimeRange(tree: StatsTree) {
  const todayIso = toISODate(new Date());

  const container: any = tree as any;
  const metaSource = container.meta ?? container;

  const first: string | undefined =
    metaSource.firstDate ||
    metaSource.earliestDate ||
    metaSource.rangeFrom ||
    metaSource.from ||
    undefined;

  const last: string | undefined =
    metaSource.lastDate ||
    metaSource.latestDate ||
    metaSource.rangeTo ||
    metaSource.to ||
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
