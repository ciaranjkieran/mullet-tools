"use client";

import { useMemo } from "react";
import { useStatsTree } from "./useStatsTree";
import { useStatsFilterStore } from "../../../store/useStatsFilterStore";
import type { StatsTree, StatsNode } from "../../../../shared/types/Stats";

export type EntityStatsKind = "goal" | "project" | "milestone" | "task";

type Args = {
  modeId: number;
  kind: EntityStatsKind;
  entityId: number;
};

export function useEntityStatsNode(args: Args | null) {
  const { range } = useStatsFilterStore();

  const hasRange = !!range.from && !!range.to;

  const treeQuery = useStatsTree(
    args && hasRange
      ? {
          modeId: args.modeId,
          from: range.from!,
          to: range.to!,
        }
      : null
  );

  const node = useMemo<StatsNode | null>(() => {
    if (!args || !treeQuery.data) return null;
    return findEntityNode(treeQuery.data, args.kind, args.entityId);
  }, [args, treeQuery.data]);

  return {
    node,
    isLoading: treeQuery.isLoading,
    isError: treeQuery.isError,
    error: treeQuery.error,
  };
}

/* -------------------------------------------------- */
/* DFS helper                                         */
/* -------------------------------------------------- */

function findEntityNode(
  tree: StatsTree,
  kind: EntityStatsKind,
  entityId: number
): StatsNode | null {
  // Search each top-level collection with the appropriate "current kind"
  for (const g of tree.goals ?? []) {
    const found = dfs(g, "goal", kind, entityId);
    if (found) return found;
  }
  for (const p of tree.projects ?? []) {
    const found = dfs(p, "project", kind, entityId);
    if (found) return found;
  }
  for (const m of tree.milestones ?? []) {
    const found = dfs(m, "milestone", kind, entityId);
    if (found) return found;
  }
  for (const t of tree.tasks ?? []) {
    const found = dfs(t, "task", kind, entityId);
    if (found) return found;
  }
  return null;
}

function dfs(
  node: StatsNode,
  currentKind: EntityStatsKind,
  targetKind: EntityStatsKind,
  targetId: number
): StatsNode | null {
  if (currentKind === targetKind && node.id === targetId) {
    return node;
  }

  // Goals
  for (const child of node.goals ?? []) {
    const found = dfs(child, "goal", targetKind, targetId);
    if (found) return found;
  }
  // Projects
  for (const child of node.projects ?? []) {
    const found = dfs(child, "project", targetKind, targetId);
    if (found) return found;
  }
  // Milestones
  for (const child of node.milestones ?? []) {
    const found = dfs(child, "milestone", targetKind, targetId);
    if (found) return found;
  }
  // Tasks
  for (const child of node.tasks ?? []) {
    const found = dfs(child, "task", targetKind, targetId);
    if (found) return found;
  }

  return null;
}
