"use client";

import { useMemo } from "react";

import type { Mode } from "@shared/types/Mode";
import type { StatsTree, StatsNode } from "@shared/types/Stats";

import { fmtDuration } from "../utils/format";
import { StatsNodeCard, type EntityKind } from "../cards/StatsNodeCard";
import { StatsPieChart, type StatsPieSegment } from "../charts/StatsPieChart";

type Props = {
  mode: Mode;
  tree: StatsTree;
  modeColor: string;
  onChainUp: (
    kind: EntityKind,
    node: StatsNode,
    parentTitle: string | null
  ) => void;
};

type FlattenedItem = {
  kind: EntityKind;
  node: StatsNode;
  parentTitle: string | null;
};

export default function StatsByModeCard({
  mode,
  tree,
  modeColor,
  onChainUp,
}: Props) {
  const modeLabel = useMemo(() => {
    const m = mode as unknown as Record<string, unknown>;
    const title = typeof m["title"] === "string" ? m["title"] : null;
    const name = typeof m["name"] === "string" ? m["name"] : null;
    return title ?? name ?? "This mode";
  }, [mode]);

  const flattened = useMemo<FlattenedItem[]>(() => {
    return flattenStatsTree(tree, modeLabel).sort(
      (a, b) => (b.node.selfSeconds ?? 0) - (a.node.selfSeconds ?? 0)
    );
  }, [tree, modeLabel]);

  const pieSegments = useMemo<StatsPieSegment[]>(() => {
    return flattened
      .filter((item) => (item.node.selfSeconds ?? 0) > 0)
      .map((item) => ({
        label: item.node.title || "Untitled",
        seconds: item.node.selfSeconds ?? 0,
      }));
  }, [flattened]);

  return (
    <div className="space-y-4">
      {/* Total + Pie */}
      <div className="flex items-start justify-between border-b border-gray-100 pb-3 gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Total
          </p>
          <p className="text-3xl font-bold">{fmtDuration(tree.seconds)}</p>
        </div>

        <StatsPieChart
          totalSeconds={tree.seconds}
          segments={pieSegments}
          color={modeColor}
        />
      </div>

      {/* Flat list of entities (StatsNodeCard) */}
      {flattened.length === 0 ? (
        <p className="text-base text-gray-500">
          No individual entities with direct time in this mode &amp; range yet.
        </p>
      ) : (
        <div className="space-y-2">
          {flattened.map((item) => (
            <StatsNodeCard
              key={`${item.kind}-${item.node.id}`}
              kind={item.kind}
              node={item.node}
              parentTitle={item.parentTitle || undefined}
              modeColor={modeColor}
              canChainUp={item.kind !== "mode"}
              onChainUp={onChainUp}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------- */
/* Helpers – flatten tree into rows                   */
/* -------------------------------------------------- */

function flattenStatsTree(tree: StatsTree, modeLabel: string): FlattenedItem[] {
  const items: FlattenedItem[] = [];

  const walk = (
    kind: Exclude<EntityKind, "mode">,
    node: StatsNode,
    parentTitle: string | null
  ) => {
    if (node.selfSeconds > 0) {
      items.push({ kind, node, parentTitle });
    }

    const hereTitle = node.title || null;

    node.goals?.forEach((child) => walk("goal", child, hereTitle));
    node.projects?.forEach((child) => walk("project", child, hereTitle));
    node.milestones?.forEach((child) => walk("milestone", child, hereTitle));
    node.tasks?.forEach((child) => walk("task", child, hereTitle));
  };

  // Top-level children are directly under the mode,
  // so we treat the mode label as their parent.
  tree.goals.forEach((g) => walk("goal", g, modeLabel));
  tree.projects.forEach((p) => walk("project", p, modeLabel));
  tree.milestones.forEach((m) => walk("milestone", m, modeLabel));
  tree.tasks.forEach((t) => walk("task", t, modeLabel));

  // Mode-level direct time
  if (tree.selfSeconds > 0) {
    const modeNode: StatsNode = {
      id: -1,
      title: modeLabel,
      selfSeconds: tree.selfSeconds,
      seconds: tree.selfSeconds,
      goals: [],
      projects: [],
      milestones: [],
      tasks: [],
    };

    items.unshift({
      kind: "mode",
      node: modeNode,
      parentTitle: null,
    });
  }

  return items;
}
