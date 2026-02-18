// src/components/timer/TimerView/hooks/useTimerBreadcrumbs.ts
"use client";

/**
 * useTimerBreadcrumbs
 *
 * Derives a stable breadcrumb (leaf title + ancestors)
 * from the active timer's path, even when lists are filtered.
 *
 * Also owns the leafTitle fallback chain:
 *   breadcrumb title → selectionFromPath title → last known title → clock default
 */

import { useEffect, useMemo, useRef } from "react";

import type { Mode } from "@shared/types/Mode";
import type { Goal } from "@shared/types/Goal";
import type { Project } from "@shared/types/Project";
import type { Milestone } from "@shared/types/Milestone";
import type { Task } from "@shared/types/Task";

import { pathToIdPayload } from "../utils/timerPath";
import {
  buildBreadcrumbFromIds,
  type Crumb,
  type TimerPathIds,
  type SelectionLike,
} from "../types/timerTypes";

type ActiveLike =
  | {
      sessionId?: string | number | null;
      path?: unknown | null;
    }
  | null
  | undefined;

type UseTimerBreadcrumbsArgs = {
  active: ActiveLike;
  modes: Mode[];
  goals: Goal[];
  projects: Project[];
  milestones: Milestone[];
  tasks: Task[];
  /** Normalised selection derived from the active path — used as leafTitle fallback. */
  selectionFromPath: SelectionLike | null;
  clockType: "stopwatch" | "timer";
};

// 🔒 Module-level cache: survives unmount/remount of TimerView
let lastCrumbsGlobal: {
  sessionId: string | number;
  crumbs: Crumb[];
} | null = null;

export function useTimerBreadcrumbs({
  active,
  modes,
  goals,
  projects,
  milestones,
  tasks,
  selectionFromPath,
  clockType,
}: UseTimerBreadcrumbsArgs) {
  const pathIds: TimerPathIds = useMemo(
    () => (active?.path ? pathToIdPayload(active.path as any) : {}),
    [active?.path]
  );

  const rawBreadcrumb = useMemo<Crumb[]>(() => {
    // deps created inside memo so it doesn't churn the dependency array
    return buildBreadcrumbFromIds(pathIds, {
      modes,
      goals,
      projects,
      milestones,
      tasks,
    });
  }, [pathIds, modes, goals, projects, milestones, tasks]);

  // Update global cache whenever we have a real breadcrumb for this session
  useEffect(() => {
    const sid = active?.sessionId;
    if (
      (typeof sid === "string" || typeof sid === "number") &&
      rawBreadcrumb.length > 0
    ) {
      lastCrumbsGlobal = {
        sessionId: sid,
        crumbs: rawBreadcrumb,
      };
    }
  }, [active?.sessionId, rawBreadcrumb]);

  const breadcrumb = useMemo(() => {
    const sid = active?.sessionId;
    const last = lastCrumbsGlobal;

    if (
      (typeof sid === "string" || typeof sid === "number") &&
      rawBreadcrumb.length === 0 &&
      last &&
      last.sessionId === sid
    ) {
      return last.crumbs;
    }

    return rawBreadcrumb;
  }, [active?.sessionId, rawBreadcrumb]);

  const rawLeafTitle = breadcrumb.length > 0 ? breadcrumb[0].title : null;
  const ancestors = breadcrumb.slice(1);

  // Secondary fallback: derive title from the active path's normalised selection
  const leafTitleFromIds = useMemo(() => {
    if (!selectionFromPath) return null;
    const { taskId, milestoneId, projectId, goalId, modeId: selModeId } =
      selectionFromPath;

    if (taskId != null) return tasks.find((x) => x.id === taskId)?.title ?? null;
    if (milestoneId != null)
      return milestones.find((x) => x.id === milestoneId)?.title ?? null;
    if (projectId != null)
      return projects.find((x) => x.id === projectId)?.title ?? null;
    if (goalId != null) return goals.find((x) => x.id === goalId)?.title ?? null;
    if (selModeId != null)
      return modes.find((x) => x.id === selModeId)?.title ?? null;
    return null;
  }, [selectionFromPath, tasks, milestones, projects, goals, modes]);

  // Sticky ref: holds the last non-null leafTitleFromIds so it survives resets
  const lastLeafTitleRef = useRef<string | null>(null);
  useEffect(() => {
    if (leafTitleFromIds) lastLeafTitleRef.current = leafTitleFromIds;
  }, [leafTitleFromIds]);

  const leafTitle =
    rawLeafTitle ??
    leafTitleFromIds ??
    lastLeafTitleRef.current ??
    (clockType === "timer" ? "Timer" : "Stopwatch");

  return { breadcrumb, leafTitle, ancestors, pathIds };
}
