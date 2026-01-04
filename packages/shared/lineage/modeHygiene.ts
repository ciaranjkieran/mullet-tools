import { Goal } from "../types/Goal";
import { Project } from "../types/Project";
import { Milestone } from "../types/Milestone";

export function cleanseAncestorsByMode(
  modeId: number | null | undefined,
  ids: {
    goalId?: number | null;
    projectId?: number | null;
    parentId?: number | null;
    milestoneId?: number | null;
  },
  lists: { goals: Goal[]; projects: Project[]; milestones: Milestone[] }
) {
  if (!modeId) return ids;

  const goalOk =
    ids.goalId != null &&
    lists.goals.some((g) => g.id === ids.goalId && g.modeId === modeId);
  const projOk =
    ids.projectId != null &&
    lists.projects.some((p) => p.id === ids.projectId && p.modeId === modeId);
  const parentOk =
    ids.parentId != null &&
    lists.milestones.some((m) => m.id === ids.parentId && m.modeId === modeId);
  const msOk =
    ids.milestoneId != null &&
    lists.milestones.some(
      (m) => m.id === ids.milestoneId && m.modeId === modeId
    );

  return {
    ...ids,
    goalId: goalOk ? ids.goalId! : null,
    projectId: projOk ? ids.projectId! : null,
    parentId: parentOk ? ids.parentId! : null,
    milestoneId: msOk ? ids.milestoneId! : null,
  };
}
