/**
 * timerEntityScope
 *
 * Pure utility functions for scoping and navigating the entity hierarchy
 * within a timer session. No React, no side effects.
 */

import type { Goal } from "@shared/types/Goal";
import type { Milestone } from "@shared/types/Milestone";
import type { TaskWithLinks } from "../types/timerTypes";

export type EntityType = "task" | "milestone" | "project" | "goal";

/** The current selection scope, used by all scoped list functions. */
export type EntityScope = {
  modeId: number;
  goalId: number | null;
  projectId: number | null;
  milestoneId: number | null;
};

// ─── Shared list utilities ────────────────────────────────────────────────────

export function sortByPosition<T extends { position: number; id: number }>(
  arr: T[]
): T[] {
  return [...arr].sort((a, b) => a.position - b.position || a.id - b.id);
}

export function nextAfter<T extends { position: number; id: number }>(
  ordered: T[],
  currentId: number
): T | null {
  if (!ordered.length) return null;
  const idx = ordered.findIndex((x) => x.id === currentId);
  if (idx < 0) return ordered[0] ?? null;
  return ordered[idx + 1] ?? null;
}

// ─── Deepest-entity resolution ────────────────────────────────────────────────

export function getDeepestEntity(selection: {
  taskId: number | null;
  milestoneId: number | null;
  projectId: number | null;
  goalId: number | null;
}): { entityType: EntityType; entityId: number } | null {
  if (selection.taskId != null)
    return { entityType: "task", entityId: selection.taskId };
  if (selection.milestoneId != null)
    return { entityType: "milestone", entityId: selection.milestoneId };
  if (selection.projectId != null)
    return { entityType: "project", entityId: selection.projectId };
  if (selection.goalId != null)
    return { entityType: "goal", entityId: selection.goalId };
  return null;
}

// ─── Scoped ordered lists (deepest-wins lane logic) ──────────────────────────

export function scopedGoalsByPosition(
  goals: Goal[],
  modeId: number
): Goal[] {
  return sortByPosition(
    goals.filter((g) => g.modeId === modeId && !g.isCompleted)
  );
}

/**
 * Returns the task lane scoped to the current project/milestone/goal context.
 * Used for "next project" navigation (navigates by task position within scope).
 */
export function scopedProjectsByPosition(
  tasksWithLinks: TaskWithLinks[],
  scope: EntityScope
): TaskWithLinks[] {
  const { modeId, milestoneId, projectId, goalId } = scope;
  const base = tasksWithLinks.filter(
    (t) => t.modeId === modeId && !t.isCompleted
  );

  if (milestoneId != null)
    return sortByPosition(base.filter((t) => t.milestoneId === milestoneId));

  if (projectId != null)
    return sortByPosition(
      base.filter((t) => t.projectId === projectId && t.milestoneId == null)
    );

  if (goalId != null)
    return sortByPosition(
      base.filter(
        (t) =>
          t.goalId === goalId && t.projectId == null && t.milestoneId == null
      )
    );

  return sortByPosition(
    base.filter(
      (t) => t.goalId == null && t.projectId == null && t.milestoneId == null
    )
  );
}

export function scopedMilestonesByPosition(
  milestones: Milestone[],
  milestonesById: Map<number, Milestone>,
  scope: EntityScope
): Milestone[] {
  const { modeId, milestoneId, projectId, goalId } = scope;
  const base = milestones.filter(
    (m) => m.modeId === modeId && !m.isCompleted
  );

  if (milestoneId != null) {
    const current = milestonesById.get(milestoneId) ?? null;
    const parentId = current?.parentId ?? null;
    if (parentId != null)
      return sortByPosition(base.filter((m) => m.parentId === parentId));
  }

  if (projectId != null)
    return sortByPosition(
      base.filter((m) => m.projectId === projectId && m.parentId == null)
    );

  if (goalId != null)
    return sortByPosition(
      base.filter(
        (m) =>
          m.goalId === goalId && m.projectId == null && m.parentId == null
      )
    );

  return sortByPosition(
    base.filter(
      (m) => m.goalId == null && m.projectId == null && m.parentId == null
    )
  );
}

export function scopedTasksByPosition(
  tasksWithLinks: TaskWithLinks[],
  scope: EntityScope
): TaskWithLinks[] {
  const { modeId, milestoneId, projectId, goalId } = scope;
  const base = tasksWithLinks.filter(
    (t) => t.modeId === modeId && !t.isCompleted
  );

  if (milestoneId != null)
    return sortByPosition(base.filter((t) => t.milestoneId === milestoneId));

  if (projectId != null)
    return sortByPosition(
      base.filter((t) => t.projectId === projectId && t.milestoneId == null)
    );

  if (goalId != null)
    return sortByPosition(
      base.filter(
        (t) =>
          t.goalId === goalId && t.projectId == null && t.milestoneId == null
      )
    );

  return sortByPosition(
    base.filter(
      (t) => t.goalId == null && t.projectId == null && t.milestoneId == null
    )
  );
}
