// @shared/lineage/useScopedLineage.ts
import type { Goal } from "../types/Goal";
import type { Project } from "../types/Project";
import type { Milestone } from "../types/Milestone";
import type { Task } from "../types/Task";
import {
  projectEffectiveGoalId,
  milestoneEffectiveGoalId,
  milestoneEffectiveProjectId,
  projectBelongsUnder,
  milestoneBelongsUnder,
} from "../lineage/effective";

export type LineageMaps = {
  goalsById: Map<number, Goal>;
  projectsById: Map<number, Project>;
  milestonesById: Map<number, Milestone>;
};

export type ScopeCtx = {
  modeId: number; // -1 means “none”
  goalId: number | null;
  projectId: number | null;
  milestoneId: number | null;
};

// ── GOALS ────────────────────────────────────────────────────────────
export function scopeGoals(goals: Goal[], modeId: number): Goal[] {
  if (modeId === -1) return [];
  return goals.filter((g) => g.modeId === modeId);
}

// ── PROJECTS ─────────────────────────────────────────────────────────
export function scopeProjects(
  projects: Project[],
  ctx: Pick<ScopeCtx, "modeId" | "goalId">,
  maps: LineageMaps
): Project[] {
  const { modeId, goalId } = ctx;
  if (modeId === -1) return [];
  return projects.filter((p) => {
    const gId = projectEffectiveGoalId(p.id, maps.projectsById);
    if (goalId != null) return gId === goalId;
    const g = gId != null ? maps.goalsById.get(gId) : undefined;
    return g?.modeId === modeId;
  });
}

// ── MILESTONES ───────────────────────────────────────────────────────
export function scopeMilestones(
  milestones: Milestone[],
  ctx: Pick<ScopeCtx, "modeId" | "goalId" | "projectId">,
  maps: LineageMaps
): Milestone[] {
  const { modeId, goalId, projectId } = ctx;
  if (modeId === -1) return [];
  return milestones.filter((m) => {
    const effGoalId = milestoneEffectiveGoalId(
      m.id,
      maps.milestonesById,
      maps.projectsById
    );

    if (projectId != null) {
      const effProjId = milestoneEffectiveProjectId(m.id, maps.milestonesById);
      if (effProjId == null) return false;
      return (
        effProjId === projectId ||
        projectBelongsUnder(effProjId, projectId, maps.projectsById)
      );
    }

    if (goalId != null) return effGoalId === goalId;

    const g = effGoalId != null ? maps.goalsById.get(effGoalId) : undefined;
    return g?.modeId === modeId;
  });
}

// ── TASKS ────────────────────────────────────────────────────────────
function taskEffGoalId(t: Task, maps: LineageMaps): number | null {
  // Task may carry some (or none) of these; treat as optional
  const msId =
    (t as unknown as { milestoneId?: number | null }).milestoneId ?? null;
  const prId =
    (t as unknown as { projectId?: number | null }).projectId ?? null;
  const tgId = (t as unknown as { goalId?: number | null }).goalId ?? null;

  if (msId != null)
    return milestoneEffectiveGoalId(
      msId,
      maps.milestonesById,
      maps.projectsById
    );
  if (prId != null) return projectEffectiveGoalId(prId, maps.projectsById);
  return tgId ?? null;
}

function taskEffProjectId(t: Task, maps: LineageMaps): number | null {
  const msId =
    (t as unknown as { milestoneId?: number | null }).milestoneId ?? null;
  const prId =
    (t as unknown as { projectId?: number | null }).projectId ?? null;
  if (msId != null)
    return milestoneEffectiveProjectId(msId, maps.milestonesById);
  return prId ?? null;
}

export function scopeTasks(
  tasks: Task[],
  ctx: ScopeCtx,
  maps: LineageMaps
): Task[] {
  const { modeId, goalId, projectId, milestoneId } = ctx;
  if (modeId === -1) return [];
  return tasks.filter((t) => {
    const tMsId =
      (t as unknown as { milestoneId?: number | null }).milestoneId ?? null;
    const effProjId = taskEffProjectId(t, maps);
    const effGoalId = taskEffGoalId(t, maps);

    if (milestoneId != null) {
      if (tMsId == null) return false;
      return (
        tMsId === milestoneId ||
        milestoneBelongsUnder(tMsId, milestoneId, maps.milestonesById)
      );
    }

    if (projectId != null) {
      if (effProjId == null) return false;
      return (
        effProjId === projectId ||
        projectBelongsUnder(effProjId, projectId, maps.projectsById)
      );
    }

    if (goalId != null) return effGoalId === goalId;

    const g = effGoalId != null ? maps.goalsById.get(effGoalId) : undefined;
    return g?.modeId === modeId;
  });
}
