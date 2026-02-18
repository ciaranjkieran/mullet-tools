// src/components/timer/TimerView/hooks/timerTypes.ts
/**
 * Shared timer selection types and helpers
 * used by the controller and sub-hooks.
 */

import type { Mode } from "@shared/types/Mode";
import type { Goal } from "@shared/types/Goal";
import type { Project } from "@shared/types/Project";
import type { Milestone } from "@shared/types/Milestone";
import type { Task } from "@shared/types/Task";

import {
  makeProjectMaps,
  makeMilestoneMaps,
  milestoneEffectiveLineage,
  projectEffectiveLineage,
} from "@shared/lineage/effective";

/** Task augmented with the link fields the server includes but the base Task type omits. */
export type TaskWithLinks = Task & {
  goalId?: number | null;
  projectId?: number | null;
  milestoneId?: number | null;
};

export type SelectionLike = {
  modeId: number;
  goalId: number | null;
  projectId: number | null;
  milestoneId: number | null;
  taskId: number | null;
};

export type TimerPathIds = {
  modeId?: number | string | null;
  goalId?: number | string | null;
  projectId?: number | string | null;
  milestoneId?: number | string | null;
  taskId?: number | string | null;
};

export type TimerDeps = {
  modes: Mode[];
  goals: Goal[];
  projects: Project[];
  milestones: Milestone[];
  tasks: Task[];
};

export type Crumb = {
  type: "mode" | "goal" | "project" | "milestone" | "task";
  id: number;
  title: string;
};

type MaybeId = number | string | null | undefined;

const toNum = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Deepest id wins for retarget PATCH payload. */
export function buildRetargetPayload(sel: {
  modeId: number | null | undefined;
  goalId: number | null | undefined;
  projectId: number | null | undefined;
  milestoneId: number | null | undefined;
  taskId: number | null | undefined;
}) {
  const { taskId, milestoneId, projectId, goalId, modeId } = sel;
  if (taskId != null) return { taskId };
  if (milestoneId != null) return { milestoneId };
  if (projectId != null) return { projectId };
  if (goalId != null) return { goalId };
  if (modeId != null) return { modeId };
  return null;
}

/** Normalize a raw path id payload into a full SelectionLike. */
export function normalizePathIdsToSelection(
  ids: TimerPathIds,
  fallbackModeId: number
): SelectionLike {
  return {
    modeId: typeof ids?.modeId === "number" ? ids.modeId : fallbackModeId,
    goalId: typeof ids?.goalId === "number" ? ids.goalId : null,
    projectId: typeof ids?.projectId === "number" ? ids.projectId : null,
    milestoneId: typeof ids?.milestoneId === "number" ? ids.milestoneId : null,
    taskId: typeof ids?.taskId === "number" ? ids.taskId : null,
  };
}

/** Robustly resolve the session's true Mode id from the path. */
export function resolveModeIdFromPathStrict(
  ids: TimerPathIds,
  deps: {
    goals: Goal[];
    projects: Project[];
    milestones: Milestone[];
    tasks: Task[];
  }
): number | null {
  const tId = toNum(ids.taskId);
  const mId = toNum(ids.milestoneId);
  const pId = toNum(ids.projectId);
  const gId = toNum(ids.goalId);
  const mExplicit = toNum(ids.modeId);

  if (tId != null) {
    const t = deps.tasks.find((x) => x.id === tId);
    if (t) return t.modeId ?? null;
  }
  if (mId != null) {
    const m = deps.milestones.find((x) => x.id === mId);
    if (m) return m.modeId ?? null;
  }
  if (pId != null) {
    const p = deps.projects.find((x) => x.id === pId);
    if (p) return p.modeId ?? null;
  }
  if (gId != null) {
    const g = deps.goals.find((x) => x.id === gId);
    if (g) return g.modeId ?? null;
  }

  return mExplicit ?? null;
}

/**
 * Build a breadcrumb from ids + data, resolving missing ancestors via lineage.
 * Leaf first (task → milestone → project → goal → mode).
 */
export function buildBreadcrumbFromIds(
  rawIds: TimerPathIds,
  deps: TimerDeps
): Crumb[] {
  const { modes, goals, projects, milestones, tasks } = deps;

  const ids = {
    modeId: toNum(rawIds.modeId),
    goalId: toNum(rawIds.goalId),
    projectId: toNum(rawIds.projectId),
    milestoneId: toNum(rawIds.milestoneId),
    taskId: toNum(rawIds.taskId),
  };

  const { byId: projectsById } = makeProjectMaps(projects);
  const { byId: milestonesById } = makeMilestoneMaps(milestones);

  const findMode = (id: number | null) =>
    id != null ? modes.find((x) => x.id === id) : undefined;
  const findGoal = (id: number | null) =>
    id != null ? goals.find((x) => x.id === id) : undefined;
  const findProject = (id: number | null) =>
    id != null ? projects.find((x) => x.id === id) : undefined;
  const findMs = (id: number | null) =>
    id != null ? milestones.find((x) => x.id === id) : undefined;
  const findTask = (id: number | null) =>
    id != null ? tasks.find((x) => x.id === id) : undefined;

  const out: Crumb[] = [];

  if (ids.taskId != null) {
    const t = findTask(ids.taskId);
    if (t) out.push({ type: "task", id: t.id, title: t.title });

    const msId: number | null = toNum(t?.milestoneId) ?? ids.milestoneId; // ✅ const
    let pId: number | null = toNum(t?.projectId) ?? ids.projectId; // may be filled via lineage
    let gId: number | null = toNum(t?.goalId) ?? ids.goalId; // may be filled via lineage

    if (msId != null) {
      const ms = findMs(msId);
      if (ms) out.push({ type: "milestone", id: ms.id, title: ms.title });

      const effMs = milestoneEffectiveLineage(
        msId,
        milestonesById,
        projectsById
      );
      if (pId == null) pId = effMs.projectId ?? null;
      if (gId == null) gId = effMs.goalId ?? null;
    }

    if (pId != null) {
      const p = findProject(pId);
      if (p) out.push({ type: "project", id: p.id, title: p.title });

      const effP = projectEffectiveLineage(pId, projectsById);
      if (gId == null) gId = effP.goalId ?? null;
    }

    if (gId != null) {
      const g = findGoal(gId);
      if (g) out.push({ type: "goal", id: g.id, title: g.title });
    }
  } else if (ids.milestoneId != null) {
    const ms = findMs(ids.milestoneId);
    if (ms) out.push({ type: "milestone", id: ms.id, title: ms.title });

    const eff = milestoneEffectiveLineage(
      ids.milestoneId,
      milestonesById,
      projectsById
    );

    if (eff.projectId != null) {
      const p = findProject(eff.projectId);
      if (p) out.push({ type: "project", id: p.id, title: p.title });
    }
    if (eff.goalId != null) {
      const g = findGoal(eff.goalId);
      if (g) out.push({ type: "goal", id: g.id, title: g.title });
    }
  } else if (ids.projectId != null) {
    const p = findProject(ids.projectId);
    if (p) out.push({ type: "project", id: p.id, title: p.title });

    const eff = projectEffectiveLineage(ids.projectId, projectsById);
    if (eff.goalId != null) {
      const g = findGoal(eff.goalId);
      if (g) out.push({ type: "goal", id: g.id, title: g.title });
    }
  } else if (ids.goalId != null) {
    const g = findGoal(ids.goalId);
    if (g) out.push({ type: "goal", id: g.id, title: g.title });
  }

  // Mode (derive from leaf if not explicitly provided)
  let resolvedModeId: number | null = ids.modeId ?? null;

  if (resolvedModeId == null) {
    const leaf = out[0];
    if (leaf?.type === "task")
      resolvedModeId = findTask(leaf.id)?.modeId ?? null;
    else if (leaf?.type === "milestone")
      resolvedModeId = findMs(leaf.id)?.modeId ?? null;
    else if (leaf?.type === "project")
      resolvedModeId = findProject(leaf.id)?.modeId ?? null;
    else if (leaf?.type === "goal")
      resolvedModeId = findGoal(leaf.id)?.modeId ?? null;

    if (resolvedModeId == null) {
      if (ids.taskId != null)
        resolvedModeId = findTask(ids.taskId)?.modeId ?? null;
      else if (ids.milestoneId != null)
        resolvedModeId = findMs(ids.milestoneId)?.modeId ?? null;
      else if (ids.projectId != null)
        resolvedModeId = findProject(ids.projectId)?.modeId ?? null;
      else if (ids.goalId != null)
        resolvedModeId = findGoal(ids.goalId)?.modeId ?? null;
    }
  }

  if (resolvedModeId != null) {
    const m = findMode(resolvedModeId);
    if (m) out.push({ type: "mode", id: m.id, title: m.title });
  }

  return out;
}

/** Resolve plannedSeconds for a time entry, falling back to the task (if present on Task in your app). */
type EntryLike = {
  plannedSeconds?: unknown;
  path?: { taskId?: MaybeId } | null;
};

// Your Task type (as shared) doesn’t include plannedSeconds, but your app might still have it.
// We model that safely without using `any`.
type TaskWithPlanning = Task & {
  plannedSeconds?: number | null;
  timerPlannedSeconds?: number | null;
};

export function resolvePlannedSecondsForEntry(
  entry: unknown,
  taskById: Map<number, Task>
): number | null {
  const e = entry as EntryLike | null;

  const fromEntry = e?.plannedSeconds;
  if (typeof fromEntry === "number") return fromEntry;

  const tId = toNum(e?.path?.taskId);
  if (tId != null) {
    const task = taskById.get(tId) as TaskWithPlanning | undefined;
    const fromTask = task?.plannedSeconds ?? task?.timerPlannedSeconds ?? null;
    if (typeof fromTask === "number") return fromTask;
  }

  return null;
}
