// src/components/timer/TimerView/hooks/useTimerBreadcrumbs.ts
"use client";

/**
 * useTimerBreadcrumbs
 *
 * Derives a stable breadcrumb (leaf title + ancestors)
 * from the active timer's path, even when lists are filtered.
 */

import { useEffect, useMemo } from "react";

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

  const leafTitle = breadcrumb.length > 0 ? breadcrumb[0].title : "Stopwatch";
  const ancestors = breadcrumb.slice(1);

  return { breadcrumb, leafTitle, ancestors, pathIds };
}
