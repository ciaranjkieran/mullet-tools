// apps/web/src/components/entities/projects/windows/tabs/ProjectStatsTab.tsx
"use client";

import { useMemo, useEffect } from "react";

import { Project } from "@shared/types/Project";
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
  project: Project;
  modes: Mode[]; // parity / future use
  modeColor: string;
};

type ChildRow = {
  kind: EntityKind;
  node: StatsNode;
  parentTitle: string | null;
};

export default function ProjectStatsTab({ project, modeColor }: Props) {
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
          modeId: project.modeId,
          from,
          to,
        }
      : null
  );

  const projectNode = useMemo<StatsNode | null>(() => {
    if (!rangedTree) return null;
    return findProjectNode(rangedTree, project.id);
  }, [rangedTree, project.id]);

  // 🔹 All-time range: prefer node-level meta, fall back to tree-level meta
  const allTimeRange = useMemo(() => {
    if (projectNode) {
      const nodeRange = extractNodeAllTimeRange(projectNode);
      if (nodeRange) return nodeRange;
    }
    if (rangedTree) {
      return extractAllTimeRange(rangedTree as StatsTree);
    }
    return null;
  }, [projectNode, rangedTree]);

  const totalSeconds = projectNode?.seconds ?? 0;

  // 🔹 Build BOTH: pie segments + list rows from the same subtree
  const { segments, childRows } = useMemo(() => {
    if (!projectNode) {
      return { segments: [] as StatsPieSegment[], childRows: [] as ChildRow[] };
    }

    const segs: StatsPieSegment[] = [];
    const rows: ChildRow[] = [];
    const rootTitle = projectNode.title || null;

    // ✅ Card + segment for work directly on this project (direct-only)
    const selfSeconds = projectNode.selfSeconds ?? 0;
    if (selfSeconds > 0) {
      segs.push({
        label: projectNode.title || "This project",
        seconds: selfSeconds,
      });

      rows.push({
        kind: "project",
        node: {
          ...projectNode,
          seconds: selfSeconds,
          goals: [],
          projects: [],
          milestones: [],
          tasks: [],
        },
        parentTitle: null,
      });
    }

    // 🔁 Recursively walk all nested projects / milestones / tasks
    const walkChildren = (node: StatsNode, parentTitle: string | null) => {
      // nested projects
      node.projects?.forEach((p) => {
        const pSelf = p.selfSeconds ?? 0;
        if (pSelf > 0) {
          rows.push({
            kind: "project",
            node: p,
            parentTitle,
          });

          segs.push({
            label: p.title || "Sub-project",
            seconds: pSelf,
          });
        }

        const nextParentTitle = p.title || parentTitle;
        walkChildren(p, nextParentTitle);
      });

      // milestones (and their nested milestones/tasks)
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

      // tasks at this level (leaves – direct time)
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

    // start recursion from this project
    walkChildren(projectNode, rootTitle);

    // sort by total seconds (desc) for nicer UX
    rows.sort((a, b) => (b.node.seconds ?? 0) - (a.node.seconds ?? 0));

    return { segments: segs, childRows: rows };
  }, [projectNode]);

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
        // Fallback: keep current range but mark preset
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
      from: nextFrom,
      to: nextTo,
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

      {!isLoading && !isError && !projectNode && (
        <p className="text-sm text-gray-500">
          No tracked time for this project in the selected range.
        </p>
      )}

      {!isLoading && !isError && projectNode && totalSeconds > 0 && (
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
              All time is logged directly on this project. No child items with
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

/* -------------------- helpers -------------------- */

function findProjectNode(tree: StatsTree, projectId: number): StatsNode | null {
  // Search a list of project nodes (and their child projects) for the id
  const searchProjects = (nodes: StatsNode[] | undefined): StatsNode | null => {
    if (!nodes) return null;

    for (const node of nodes) {
      // We know everything in this list is a "project"
      if (node.id === projectId) return node;

      // Recurse into nested projects
      const inChildren = searchProjects(node.projects);
      if (inChildren) return inChildren;
    }

    return null;
  };

  // 1) Projects directly under the mode
  const fromTop = searchProjects(tree.projects);
  if (fromTop) return fromTop;

  // 2) Projects under each goal
  if (tree.goals) {
    for (const goal of tree.goals) {
      const fromGoal = searchProjects(goal.projects);
      if (fromGoal) return fromGoal;
    }
  }

  return null;
}

/* -------------------- range/meta helpers -------------------- */

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

  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const from = toISODate(start);
  return { from, to, preset: "thisMonth" };
}
