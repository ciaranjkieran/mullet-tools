"use client";

import { useMemo } from "react";

import type { Mode } from "@shared/types/Mode";
import type { StatsTree, StatsNode } from "@shared/types/Stats";

import { fmtDuration } from "../utils/format";
import StatsByModeCard from "./StatsByModeCard";
import { StatsPieChart, type StatsPieSegment } from "../charts/StatsPieChart";
import type { EntityKind } from "../cards/StatsNodeCard";

type Props = {
  modes: Mode[];
  /** Map: mode.id -> StatsTree for that mode & range */
  treesByMode: Record<number, StatsTree | undefined>;
  /** Chain-up handler coming from StatsView */
  onChainUp: (
    mode: Mode,
    kind: EntityKind,
    node: StatsNode,
    parentTitle: string | null
  ) => void;
};

export default function AllModeStatsCard({
  modes,
  treesByMode,
  onChainUp,
}: Props) {
  // 🥧 Build "by mode" segments for the *overall* pie
  const modeSegments = useMemo<StatsPieSegment[]>(() => {
    return modes
      .map((mode) => {
        const tree = treesByMode[mode.id];
        const seconds = tree?.seconds ?? 0;
        return {
          label: mode.title || "Untitled mode",
          seconds,
          color: mode.color, // 🔗 wire each segment to its mode colour
        };
      })
      .filter((seg) => seg.seconds > 0);
  }, [modes, treesByMode]);

  const totalAcrossModes = modeSegments.reduce(
    (sum, seg) => sum + seg.seconds,
    0
  );

  if (modes.length === 0) return null;

  return (
    <div className="space-y-8">
      {/* 🔝 Overall breakdown by mode (single pie for All-modes) */}
      {totalAcrossModes > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Total (all modes)
              </p>
              <p className="text-3xl font-bold">
                {fmtDuration(totalAcrossModes)}
              </p>
            </div>

            <StatsPieChart
              totalSeconds={totalAcrossModes}
              segments={modeSegments}
              // Fallback colour; actual segments use their own mode.color now
              color="#111827"
              solid // 🟢 full-opacity slices for per-mode breakdown
            />
          </div>
        </div>
      )}

      {/* 📚 Per-mode blocks, mirroring AllModeCommentSection structure */}
      {modes.map((mode) => {
        const tree = treesByMode[mode.id];
        if (!tree || tree.seconds <= 0) return null;

        return (
          <div
            key={mode.id}
            className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            {/* Mode header strip, same visual as comments/boards */}
            <div className="flex items-center gap-2">
              <span
                className="h-5 w-1.5 rounded-sm"
                style={{ backgroundColor: mode.color }}
              />
              <h2 className="text-lg font-semibold text-gray-800">
                {mode.title}
              </h2>
            </div>

            <StatsByModeCard
              mode={mode}
              tree={tree}
              modeColor={mode.color}
              onChainUp={(kind, node, parentTitle) =>
                onChainUp(mode, kind, node, parentTitle)
              }
            />
          </div>
        );
      })}
    </div>
  );
}
