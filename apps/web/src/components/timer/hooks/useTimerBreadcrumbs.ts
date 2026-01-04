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
  type TimerDeps,
} from "../types/timerTypes";

type UseTimerBreadcrumbsArgs = {
  active: any | null;
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
  const deps: TimerDeps = { modes, goals, projects, milestones, tasks };

  const pathIds = useMemo(
    () => (active?.path ? pathToIdPayload(active.path) : {}),
    [active?.path]
  );

  const rawBreadcrumb = useMemo<Crumb[]>(
    () => buildBreadcrumbFromIds(pathIds as any, deps),
    [pathIds, deps]
  );

  // Update global cache whenever we have a real breadcrumb for this session
  useEffect(() => {
    if (active?.sessionId && rawBreadcrumb.length > 0) {
      lastCrumbsGlobal = {
        sessionId: active.sessionId,
        crumbs: rawBreadcrumb,
      };
    }
  }, [active?.sessionId, rawBreadcrumb]);

  const breadcrumb = useMemo(() => {
    const last = lastCrumbsGlobal;

    // If:
    // - there is an active session
    // - current build produced no crumbs (e.g. lists filtered for another mode)
    // - and we have cached crumbs for this same session
    // → fall back to the cached crumbs instead of "no breadcrumb".
    if (
      active?.sessionId &&
      rawBreadcrumb.length === 0 &&
      last &&
      last.sessionId === active.sessionId
    ) {
      return last.crumbs;
    }

    return rawBreadcrumb;
  }, [active?.sessionId, rawBreadcrumb]);

  const leafTitle = breadcrumb.length > 0 ? breadcrumb[0].title : "Stopwatch";
  const ancestors = breadcrumb.slice(1);

  return { breadcrumb, leafTitle, ancestors, pathIds };
}
