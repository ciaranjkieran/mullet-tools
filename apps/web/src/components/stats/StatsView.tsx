"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";

import type { Mode } from "@shared/types/Mode";
import type { Task } from "@shared/types/Task";
import type { Goal } from "@shared/types/Goal";
import type { Project } from "@shared/types/Project";
import type { Milestone } from "@shared/types/Milestone";
import type { StatsTree, StatsNode } from "@shared/types/Stats";

import { getContrastingText } from "@shared/utils/getContrastingText";

import {
  useStatsFilterStore,
  type StatsRange,
} from "@shared/store/useStatsFilterStore";

import { useStatsTree } from "@shared/api/hooks/stats/useStatsTree";
import { useStatsChainUp } from "@shared/api/hooks/stats/useStatsChainUp";
import type { ChainUpEntityType } from "@shared/api/hooks/stats/useStatsChainUp";

import { useModeStore } from "@shared/store/useModeStore";
import type { EntityKind } from "./cards/StatsNodeCard";
import ConfirmDialog from "../../lib/utils/ConfirmDialog";
import StatsByModeCard from "./cards/StatsByModeCard";
import AllModeStatsCard from "./cards/AllModeStatsCard";
import api from "@shared/api/axios";

type Props = {
  modes: Mode[];
  tasks: Task[];
  goals: Goal[];
  projects: Project[];
  milestones: Milestone[];
  modeColor: string;
};

type PendingChainUp = {
  kind: ChainUpEntityType;
  node: StatsNode;
  parentTitle: string | null;
};

export default function StatsView(props: Props) {
  const { modes, modeColor } = props;

  const queryClient = useQueryClient();

  const { range, setRange, setModeId } = useStatsFilterStore();
  const chainUp = useStatsChainUp();

  const [pendingChainUp, setPendingChainUp] = useState<PendingChainUp | null>(
    null
  );

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const selectedModeGlobal = useModeStore((s) => s.selectedMode) as
    | Mode
    | "All";

  const isAllSelected = selectedModeGlobal === "All";

  const effectiveMode = useMemo(() => {
    if (selectedModeGlobal !== "All") return selectedModeGlobal;
    return modes[0] ?? null;
  }, [selectedModeGlobal, modes]);

  const effectiveModeId = effectiveMode?.id ?? null;

  useEffect(() => {
    if (!isAllSelected && effectiveModeId != null) {
      setModeId(effectiveModeId);
    }
  }, [effectiveModeId, isAllSelected, setModeId]);

  // 🔹 Single-mode stats (for when a specific mode is selected)
  const {
    data: tree,
    isLoading: isLoadingSingle,
    isError: isErrorSingle,
    error: errorSingle,
  } = useStatsTree(
    !isAllSelected && effectiveModeId && range.from && range.to
      ? { modeId: effectiveModeId, from: range.from, to: range.to }
      : null
  );

  // 🔹 All-modes stats (for "All" view) – fetch one tree per mode
  const allModeQueries = useAllModesStatsTrees(
    modes,
    range.from ?? null,
    range.to ?? null,
    isAllSelected
  );

  const treesByMode: Record<number, StatsTree | undefined> = useMemo(() => {
    const map: Record<number, StatsTree | undefined> = {};
    modes.forEach((mode, idx) => {
      const q = allModeQueries[idx];
      if (q && q.data) {
        map[mode.id] = q.data as StatsTree;
      }
    });
    return map;
  }, [modes, allModeQueries]);

  const isLoadingAll = allModeQueries.some((q) => q.isLoading);
  const anyErrorAll = allModeQueries.some((q) => q.isError);
  const firstErrorAll = allModeQueries.find((q) => q.error)?.error;

  const hasAnyAllStats = Object.values(treesByMode).some(
    (t) => t && t.seconds > 0
  );

  const headerColor = modeColor;
  const headerTextColor = getContrastingText(headerColor);
  const activePreset = (range.preset ?? "today") as StatsRange["preset"];

  // 🔹 All-time range for single-mode view (based on that mode's tree metadata)
  const singleAllTimeRange = useMemo(() => {
    if (!tree) return null;
    return extractAllTimeRange(tree as StatsTree);
  }, [tree]);

  // 🔹 All-time range across all modes (min firstDate / max lastDate)
  const allAllTimeRange = useMemo(() => {
    const ranges = Object.values(treesByMode)
      .filter((t): t is StatsTree => !!t)
      .map((t) => extractAllTimeRange(t));

    if (!ranges.length) return null;

    let from = ranges[0].from;
    let to = ranges[0].to;

    for (const r of ranges) {
      if (r.from < from) from = r.from;
      if (r.to > to) to = r.to;
    }

    return { from, to };
  }, [treesByMode]);

  const allTimeRange = isAllSelected ? allAllTimeRange : singleAllTimeRange;

  function handlePresetChange(preset: StatsRange["preset"]) {
    // 🔹 Special handling for "All time"
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

  function handleClearClick() {
    if (!range.from || !range.to) return;
    setShowClearConfirm(true);
  }

  async function handleConfirmClear() {
    if (!range.from || !range.to) return;

    setIsClearing(true);
    try {
      await api.delete("/stats/clear", {
        params: {
          from: range.from,
          to: range.to,
          // For "All" we clear across all modes;
          // otherwise only clear this mode's stats.
          ...(isAllSelected || !effectiveModeId
            ? {}
            : { modeId: effectiveModeId }),
        },
      });

      // Nuke cached stats so everything refetches
      await queryClient.invalidateQueries({ queryKey: ["statsTree"] });
    } catch (err) {
      console.error("Failed to clear stats", err);
      // optional: surface some toast / UI error
    } finally {
      setIsClearing(false);
      setShowClearConfirm(false);
    }
  }

  function handleChainUpClick(
    kind: EntityKind,
    node: StatsNode,
    parentTitle: string | null
  ) {
    // We never want chain up on mode-level rows
    if (kind === "mode" || !node.id) return;

    setPendingChainUp({
      kind: kind as ChainUpEntityType,
      node,
      parentTitle,
    });
  }

  function handleConfirmChainUp() {
    if (!pendingChainUp?.node.id) return;

    chainUp.mutate({
      entityType: pendingChainUp.kind,
      entityId: pendingChainUp.node.id,
    });
  }

  const pendingLabel = pendingChainUp?.node.title || "Untitled";
  const pendingParentLabel = pendingChainUp?.parentTitle || "its parent";

  const isLoading = isAllSelected ? isLoadingAll : isLoadingSingle;
  const isError = isAllSelected ? anyErrorAll : isErrorSingle;
  const error = isAllSelected ? firstErrorAll : errorSingle;

  const hasAnyStats =
    isAllSelected && hasAnyAllStats
      ? true
      : !isAllSelected && tree && tree.seconds > 0;

  return (
    <>
      <div className="space-y-6 text-sm">
        {/* Header / Controls */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* 📅 Range presets + custom dates */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              {/* Presets */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Range</span>
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
                        className="rounded-full border px-3 py-1 text-sm font-medium transition hover:bg-gray-50"
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

              {/* Custom date inputs */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">From</span>
                <input
                  type="date"
                  className="rounded-full border border-gray-300 bg-white px-3 py-1 text-sm outline-none hover:border-gray-400"
                  value={range.from ?? ""}
                  onChange={(e) => handleDateChange("from", e.target.value)}
                />
                <span className="text-sm font-medium text-gray-600">To</span>
                <input
                  type="date"
                  className="rounded-full border border-gray-300 bg-white px-3 py-1 text-sm outline-none hover:border-gray-400"
                  value={range.to ?? ""}
                  onChange={(e) => handleDateChange("to", e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end">
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={handleClearClick}
              disabled={!range.from || !range.to}
              className="
      py-1 text-sm font-medium
      hover:underline hover:opacity-90
      disabled:opacity-50 disabled:cursor-not-allowed
    "
              style={{
                color: !range.from || !range.to ? "#9CA3AF" : "#7b1e3a", // greyed when disabled, deep wine otherwise
              }}
            >
              Clear stats for this range
            </button>
          </div>
        </div>
        {/* Main stats panel */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          {isLoading && (
            <div className="space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
              <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
            </div>
          )}

          {isError && (
            <p className="text-base text-red-600">
              Failed to load stats: {(error as Error)?.message}
            </p>
          )}

          {!isLoading && !isError && !hasAnyStats && (
            <p className="text-base text-gray-500">
              No tracked time for this range yet.
            </p>
          )}

          {!isLoading && !isError && hasAnyStats && (
            <>
              {isAllSelected ? (
                <AllModeStatsCard
                  modes={modes}
                  treesByMode={treesByMode}
                  onChainUp={(_mode, kind, node, parentTitle) =>
                    handleChainUpClick(kind, node, parentTitle)
                  }
                />
              ) : (
                effectiveMode &&
                tree && (
                  <StatsByModeCard
                    mode={effectiveMode}
                    tree={tree as StatsTree}
                    modeColor={headerColor}
                    onChainUp={handleChainUpClick}
                  />
                )
              )}
            </>
          )}
        </div>
      </div>

      {/* 🧨 Confirm dialog for chain-up */}
      <ConfirmDialog
        open={!!pendingChainUp}
        onClose={() => setPendingChainUp(null)}
        onConfirm={handleConfirmChainUp}
        title="Chain time up?"
        description={
          <div className="space-y-2">
            <p>
              Move direct time from{" "}
              <span className="font-semibold">&quot;{pendingLabel}&quot;</span>{" "}
              up to{" "}
              <span className="font-semibold">
                &quot;{pendingParentLabel}&quot;
              </span>
              ?
            </p>
            <p className="text-sm text-gray-700">
              This will reassign that time to the parent in stats. You
              can&apos;t undo this from here.
            </p>
          </div>
        }
        confirmText="Chain up"
        cancelText="Cancel"
      />
      {/* 🧹 Confirm dialog for clearing stats */}
      <ConfirmDialog
        open={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleConfirmClear}
        title="Clear stats for this period?"
        description={
          <div className="space-y-2">
            <p>
              This will permanently delete all time entries
              {isAllSelected ? " in any mode " : " in this mode "}
              between <span className="font-semibold">
                {range.from ?? "?"}
              </span>{" "}
              and <span className="font-semibold">{range.to ?? "?"}</span>.
            </p>
            <p className="text-sm text-gray-700">
              This cannot be undone and your stats will refresh to reflect the
              change.
            </p>
          </div>
        }
        confirmText={isClearing ? "Clearing..." : "Yes, clear"}
        cancelText="Cancel"
      />
    </>
  );
}

/* -------------------------------------------------- */
/* Helpers                                            */
/* -------------------------------------------------- */

function toISODate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Read an "all-time" range from a StatsTree.
 * Expects backend to expose firstDate / lastDate on the root, or under .meta.
 */
/**
 * Read an "all-time" range from a StatsTree.
 * Expects backend to expose firstDate / lastDate on the root, or under .meta.
 */
function extractAllTimeRange(tree: StatsTree): { from: string; to: string } {
  const todayIso = toISODate(new Date());

  const container = tree as unknown as Record<string, unknown>;
  const meta = container["meta"];
  const metaSource =
    meta && typeof meta === "object"
      ? (meta as Record<string, unknown>)
      : container;

  const pickString = (v: unknown): string | undefined =>
    typeof v === "string" && v.length > 0 ? v : undefined;

  const first =
    pickString(metaSource["firstDate"]) ??
    pickString(metaSource["earliestDate"]) ??
    pickString(metaSource["rangeFrom"]) ??
    pickString(metaSource["from"]);

  const last =
    pickString(metaSource["lastDate"]) ??
    pickString(metaSource["latestDate"]) ??
    pickString(metaSource["rangeTo"]) ??
    pickString(metaSource["to"]) ??
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

/* -------------------------------------------------- */
/* All-modes fetching helper                          */
/* -------------------------------------------------- */

function useAllModesStatsTrees(
  modes: Mode[],
  from: string | null,
  to: string | null,
  enabled: boolean
) {
  const queries = useQueries({
    queries: modes.map((mode) => ({
      queryKey: ["statsTree", { modeId: mode.id, from, to }],
      queryFn: async () => {
        if (!from || !to) {
          throw new Error("Missing date range");
        }
        const res = await api.get<StatsTree>("/stats/tree", {
          params: { modeId: mode.id, from, to },
        });
        return res.data;
      },
      enabled: enabled && !!from && !!to,
    })),
  });

  return queries;
}
