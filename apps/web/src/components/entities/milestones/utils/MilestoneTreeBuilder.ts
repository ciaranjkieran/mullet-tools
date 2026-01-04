import { Milestone } from "@shared/types/Milestone";

export type NestedMilestone = Milestone & { children: NestedMilestone[] };

export function buildMilestoneTree(
  milestones: Milestone[],
  modeId: number,
  projectId?: number,
  goalId?: number,
  parentId: number | null = null
): NestedMilestone[] {
  return milestones
    .filter((m) => {
      const matchesParent = m.parentId === parentId;
      const matchesMode = m.modeId === modeId;

      const matchesProject =
        projectId === undefined || m.projectId === projectId;

      const matchesGoal = goalId === undefined || m.goalId === goalId;

      return matchesParent && matchesMode && matchesProject && matchesGoal;
    })
    .sort((a, b) => a.position - b.position)
    .map((m) => ({
      ...m,
      children: buildMilestoneTree(milestones, modeId, projectId, goalId, m.id),
    }));
}
