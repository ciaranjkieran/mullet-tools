import type { Mode } from "../types/Mode";
import type { Goal } from "../types/Goal";
import type { Project } from "../types/Project";
import type { Milestone } from "../types/Milestone";

export type EditorSelection = {
  modeId: number;
  goalId: number | null;
  projectId: number | null;
  milestoneId: number | null;
};

export type EditorDatasets = {
  modes: Mode[];
  goals: Goal[];
  projects: Project[];
  milestones: Milestone[];
};

export type EditorFiltered = {
  goals: Goal[];
  projects: Project[];
  milestones: Milestone[];
};

const normId = (v: number | null | undefined): number | null =>
  v == null || v === 0 ? null : v;

function indexProjects(projects: Project[]): Map<number, Project> {
  const byId = new Map<number, Project>();
  projects.forEach((p) =>
    byId.set(p.id, {
      ...p,
      parentId: normId(p.parentId as any),
      goalId: normId(p.goalId as any),
    })
  );
  return byId;
}

function indexMilestones(milestones: Milestone[]): Map<number, Milestone> {
  const byId = new Map<number, Milestone>();
  milestones.forEach((m) =>
    byId.set(m.id, {
      ...m,
      parentId: normId(m.parentId),
      projectId: normId(m.projectId),
      goalId: normId(m.goalId as any),
    })
  );
  return byId;
}

function projectEffectiveGoalIndex(projectIndex: Map<number, Project>) {
  const cache = new Map<number, number | null>();
  const get = (id: number | null | undefined): number | null => {
    const start = normId(id);
    if (start == null) return null;
    if (cache.has(start)) return cache.get(start)!;
    const seen = new Set<number>();
    let cur: Project | null = projectIndex.get(start) || null;
    let res: number | null = null;
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      if (cur.goalId != null) {
        res = cur.goalId;
        break;
      }
      const pid: number | null = normId(cur.parentId as any);
      cur = pid != null ? projectIndex.get(pid) || null : null;
    }
    cache.set(start, res);
    return res;
  };
  return { get };
}

function projectUnderGoal(
  project: Project,
  goalId: number,
  projectIndex: Map<number, Project>,
  effGoal: ReturnType<typeof projectEffectiveGoalIndex>
): boolean {
  const g = effGoal.get(project.id);
  return g != null && g === goalId;
}

function projectIsDescendantOf(
  project: Project,
  ancestorProjectId: number,
  projectIndex: Map<number, Project>
): boolean {
  if (project.id === ancestorProjectId) return true;
  const seen = new Set<number>();
  let cur: Project | null = project;
  while (cur && normId((cur as any).parentId) != null) {
    const pid: number | null = normId((cur as any).parentId);
    if (pid == null || seen.has(pid)) break;
    seen.add(pid);
    cur = projectIndex.get(pid) || null;
    if (cur && cur.id === ancestorProjectId) return true;
  }
  return false;
}

function effectiveProjectOfMilestone(
  milestone: Milestone,
  msIndex: Map<number, Milestone>,
  projectIndex: Map<number, Project>
): Project | null {
  const seen = new Set<number>();
  let cur: Milestone | null = milestone;
  while (cur) {
    if (cur.projectId != null) {
      const p = projectIndex.get(cur.projectId);
      if (p) return p;
    }
    const pid: number | null = normId(cur.parentId);
    if (pid == null || seen.has(pid)) break;
    seen.add(pid);
    cur = msIndex.get(pid) || null;
  }
  return null;
}

function effectiveGoalOfProject(
  project: Project | null,
  projectIndex: Map<number, Project>,
  effGoal: ReturnType<typeof projectEffectiveGoalIndex>
): number | null {
  if (!project) return null;
  return effGoal.get(project.id);
}

function effectiveGoalOfMilestone(
  milestone: Milestone,
  msIndex: Map<number, Milestone>,
  projectIndex: Map<number, Project>,
  effGoal: ReturnType<typeof projectEffectiveGoalIndex>
): number | null {
  const seen = new Set<number>();
  let cur: Milestone | null = milestone;
  while (cur) {
    if (cur.goalId != null) return cur.goalId;
    const pid: number | null = normId(cur.parentId);
    if (pid == null || seen.has(pid)) break;
    seen.add(pid);
    cur = msIndex.get(pid) || null;
  }
  const p = effectiveProjectOfMilestone(milestone, msIndex, projectIndex);
  return p ? effGoal.get(p.id) : null;
}

export function isProjectCompatible(
  sel: EditorSelection,
  project: Project | null,
  projectIndex?: Map<number, Project>
): boolean {
  if (!project) return true;
  if (project.modeId !== sel.modeId) return false;
  if (sel.goalId == null) return true;
  if (projectIndex) {
    const eff = projectEffectiveGoalIndex(projectIndex);
    return projectUnderGoal(project, sel.goalId, projectIndex, eff);
  }
  return normId(project.goalId as any) === sel.goalId;
}

export function isMilestoneCompatible(
  sel: EditorSelection,
  milestone: Milestone | null,
  msIndex?: Map<number, Milestone>,
  projectIndex?: Map<number, Project>
): boolean {
  if (!milestone) return true;
  if (milestone.modeId !== sel.modeId) return false;
  if (sel.projectId != null) {
    if (!msIndex || !projectIndex) return milestone.projectId === sel.projectId;
    const effProj = effectiveProjectOfMilestone(
      milestone,
      msIndex,
      projectIndex
    );
    if (!effProj) return false;
    return projectIsDescendantOf(effProj, sel.projectId, projectIndex);
  }
  if (sel.goalId != null) {
    if (!msIndex || !projectIndex)
      return milestone.goalId === sel.goalId && milestone.projectId == null;
    const eff = projectEffectiveGoalIndex(projectIndex);
    const g = effectiveGoalOfMilestone(milestone, msIndex, projectIndex, eff);
    return g === sel.goalId;
  }
  return true;
}

export function filterEditorOptions(
  sel: EditorSelection,
  data: EditorDatasets,
  opts?: { keepFlatToModeWhenGoalSelected?: boolean }
): EditorFiltered {
  const keepFlat = opts?.keepFlatToModeWhenGoalSelected ?? false;
  const projIdx = indexProjects(data.projects);
  const msIdx = indexMilestones(data.milestones);
  const effGoal = projectEffectiveGoalIndex(projIdx);

  const goals = data.goals.filter((g) => g.modeId === sel.modeId);

  const projects = data.projects.filter((p) => {
    if (p.modeId !== sel.modeId) return false;
    if (sel.goalId == null) return true;
    if (keepFlat && normId((p as any).goalId) == null) return true;
    const px = projIdx.get(p.id)!;
    return projectUnderGoal(px, sel.goalId, projIdx, effGoal);
  });

  const milestones = data.milestones.filter((m) => {
    if (m.modeId !== sel.modeId) return false;
    if (sel.projectId != null) {
      const effProj = effectiveProjectOfMilestone(
        msIdx.get(m.id)!,
        msIdx,
        projIdx
      );
      if (!effProj) return false;
      return projectIsDescendantOf(effProj, sel.projectId!, projIdx);
    }
    if (sel.goalId != null) {
      const g = effectiveGoalOfMilestone(
        msIdx.get(m.id)!,
        msIdx,
        projIdx,
        effGoal
      );
      return g === sel.goalId;
    }
    return true;
  });

  return { goals, projects, milestones };
}

export function reconcileAfterChange(
  prev: EditorSelection,
  next: Partial<EditorSelection>,
  data: EditorDatasets
): EditorSelection {
  const merged: EditorSelection = {
    modeId: next.modeId ?? prev.modeId,
    goalId: next.goalId === undefined ? prev.goalId : next.goalId,
    projectId: next.projectId === undefined ? prev.projectId : next.projectId,
    milestoneId:
      next.milestoneId === undefined ? prev.milestoneId : next.milestoneId,
  };

  const projIdx = indexProjects(data.projects);
  const msIdx = indexMilestones(data.milestones);
  const effGoal = projectEffectiveGoalIndex(projIdx);

  if (next.modeId !== undefined && next.modeId !== prev.modeId) {
    merged.goalId = null;
    merged.projectId = null;
    merged.milestoneId = null;
    return merged;
  }

  if (next.goalId !== undefined && next.goalId !== prev.goalId) {
    if (next.goalId === null) {
      merged.goalId = null;
      merged.projectId = null;
      merged.milestoneId = null;
      return merged;
    }
    if (merged.projectId != null) {
      const proj = projIdx.get(merged.projectId) ?? null;
      if (!isProjectCompatible(merged, proj, projIdx)) merged.projectId = null;
    }
    if (merged.milestoneId != null) {
      const ms = msIdx.get(merged.milestoneId) ?? null;
      if (!isMilestoneCompatible(merged, ms, msIdx, projIdx))
        merged.milestoneId = null;
    }
  }

  if (next.projectId !== undefined && next.projectId !== prev.projectId) {
    if (next.projectId === null) {
      merged.projectId = null;
      merged.milestoneId = null;
      return merged;
    }
    if (merged.projectId != null) {
      const proj = projIdx.get(merged.projectId) ?? null;
      merged.goalId = effectiveGoalOfProject(proj, projIdx, effGoal);
    }
    if (merged.milestoneId != null) {
      const ms = msIdx.get(merged.milestoneId) ?? null;
      if (!isMilestoneCompatible(merged, ms, msIdx, projIdx))
        merged.milestoneId = null;
    }
  }

  if (next.milestoneId !== undefined && next.milestoneId !== prev.milestoneId) {
    if (next.milestoneId === null) {
      merged.milestoneId = null;
      return merged;
    }
    if (merged.milestoneId != null) {
      const ms = msIdx.get(merged.milestoneId) ?? null;
      if (ms) {
        const effProj = effectiveProjectOfMilestone(ms, msIdx, projIdx);
        merged.projectId = effProj ? effProj.id : null;
        merged.goalId = effectiveGoalOfMilestone(ms, msIdx, projIdx, effGoal);
      }
    }
  }

  return merged;
}
