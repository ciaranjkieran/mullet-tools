// @shared/lineage/effective.ts
import type { Project } from "../types/Project";
import type { Milestone } from "../types/Milestone";

/* ─────────────────────────────────────────────────────────
   Map builders (O(1) lookups for walk-ups)
   ───────────────────────────────────────────────────────── */

export function makeProjectMaps(projects: Project[]) {
  const byId = new Map<number, Project>();
  for (const p of projects) byId.set(p.id, p);
  return { byId };
}

export function makeMilestoneMaps(milestones: Milestone[]) {
  const byId = new Map<number, Milestone>();
  for (const m of milestones) byId.set(m.id, m);
  return { byId };
}

/* ─────────────────────────────────────────────────────────
   Internal helpers with cycle guards
   ───────────────────────────────────────────────────────── */

function safeGetProject(
  id: number | null | undefined,
  projectsById: Map<number, Project>
): Project | undefined {
  return id != null ? projectsById.get(id) : undefined;
}

function safeGetMilestone(
  id: number | null | undefined,
  milestonesById: Map<number, Milestone>
): Milestone | undefined {
  return id != null ? milestonesById.get(id) : undefined;
}

/* Walk up project.parentId → … to find a goalId (or null if none) */
function walkProjectForGoal(
  startProjectId: number | null | undefined,
  projectsById: Map<number, Project>
): number | null {
  const visited = new Set<number>();
  let cur = safeGetProject(startProjectId, projectsById);

  while (cur) {
    if (cur.goalId != null) return cur.goalId;

    if (cur.parentId == null) break;
    if (visited.has(cur.parentId)) return null; // cycle guard
    visited.add(cur.parentId);

    cur = safeGetProject(cur.parentId, projectsById);
  }
  return null;
}

/* Walk up milestone.parentId → … to find the first non-null projectId */
function walkMilestoneForProject(
  startMilestoneId: number | null | undefined,
  milestonesById: Map<number, Milestone>
): number | null {
  const visited = new Set<number>();
  let cur = safeGetMilestone(startMilestoneId, milestonesById);

  while (cur) {
    if (cur.projectId != null) return cur.projectId;

    if (cur.parentId == null) break;
    if (visited.has(cur.parentId)) return null; // cycle guard
    visited.add(cur.parentId);

    cur = safeGetMilestone(cur.parentId, milestonesById);
  }
  return null;
}

/* Walk up milestone.parentId → … to find a goalId, if no project helps */
function walkMilestoneForGoal(
  startMilestoneId: number | null | undefined,
  milestonesById: Map<number, Milestone>
): number | null {
  const visited = new Set<number>();
  let cur = safeGetMilestone(startMilestoneId, milestonesById);

  while (cur) {
    if (cur.goalId != null) return cur.goalId;

    if (cur.parentId == null) break;
    if (visited.has(cur.parentId)) return null; // cycle guard
    visited.add(cur.parentId);

    cur = safeGetMilestone(cur.parentId, milestonesById);
  }
  return null;
}

/* ─────────────────────────────────────────────────────────
   Projects: effective lineage
   ───────────────────────────────────────────────────────── */

/** Direct parentId if any, else null. (Single hop by design.) */
export function projectEffectiveParentId(
  pid: number | null | undefined,
  projectsById: Map<number, Project>
): number | null {
  const p = safeGetProject(pid, projectsById);
  return p?.parentId ?? null;
}

/** Walks parent chain to find the first goalId. */
export function projectEffectiveGoalId(
  pid: number | null | undefined,
  projectsById: Map<number, Project>
): number | null {
  return walkProjectForGoal(pid, projectsById);
}

/** True if candidate is (transitively) under ancestor in the project chain. */
export function projectBelongsUnder(
  candidateId: number,
  ancestorId: number,
  projectsById: Map<number, Project>
): boolean {
  const visited = new Set<number>();
  let cur = safeGetProject(candidateId, projectsById);

  while (cur?.parentId != null) {
    if (cur.parentId === ancestorId) return true;
    if (visited.has(cur.parentId)) return false; // cycle guard
    visited.add(cur.parentId);
    cur = safeGetProject(cur.parentId, projectsById);
  }
  return false;
}

/* ─────────────────────────────────────────────────────────
   Milestones: effective lineage
   ───────────────────────────────────────────────────────── */

/** Direct parentId if any, else null. (Single hop by design.) */
export function milestoneEffectiveParentId(
  mid: number | null | undefined,
  milestonesById: Map<number, Milestone>
): number | null {
  const m = safeGetMilestone(mid, milestonesById);
  return m?.parentId ?? null;
}

/** Walks milestone chain to find first projectId. */
export function milestoneEffectiveProjectId(
  mid: number | null | undefined,
  milestonesById: Map<number, Milestone>
): number | null {
  return walkMilestoneForProject(mid, milestonesById);
}

/**
 * Effective goal for a milestone:
 * 1) If any milestone up-chain has a projectId, use that project's effective goal.
 * 2) Otherwise, walk the milestone chain for a goalId.
 */
export function milestoneEffectiveGoalId(
  mid: number | null | undefined,
  milestonesById: Map<number, Milestone>,
  projectsById: Map<number, Project>
): number | null {
  const effProjectId = milestoneEffectiveProjectId(mid, milestonesById);
  if (effProjectId != null) {
    const g = projectEffectiveGoalId(effProjectId, projectsById);
    if (g != null) return g;
  }
  return walkMilestoneForGoal(mid, milestonesById);
}

/** True if candidate is (transitively) under ancestor in the milestone chain. */
export function milestoneBelongsUnder(
  candidateId: number,
  ancestorId: number,
  milestonesById: Map<number, Milestone>
): boolean {
  const visited = new Set<number>();
  let cur = safeGetMilestone(candidateId, milestonesById);

  while (cur?.parentId != null) {
    if (cur.parentId === ancestorId) return true;
    if (visited.has(cur.parentId)) return false; // cycle guard
    visited.add(cur.parentId);
    cur = safeGetMilestone(cur.parentId, milestonesById);
  }
  return false;
}

/* ─────────────────────────────────────────────────────────
   Convenience packers (nice for UI)
   ───────────────────────────────────────────────────────── */

export function milestoneEffectiveLineage(
  mid: number,
  milestonesById: Map<number, Milestone>,
  projectsById: Map<number, Project>
) {
  return {
    parentId: milestoneEffectiveParentId(mid, milestonesById),
    projectId: milestoneEffectiveProjectId(mid, milestonesById),
    goalId: milestoneEffectiveGoalId(mid, milestonesById, projectsById),
  };
}

export function projectEffectiveLineage(
  pid: number,
  projectsById: Map<number, Project>
) {
  return {
    parentId: projectEffectiveParentId(pid, projectsById),
    goalId: projectEffectiveGoalId(pid, projectsById),
  };
}
