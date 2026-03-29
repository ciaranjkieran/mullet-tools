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
      if (m.parentId !== parentId) return false;
      if (m.modeId !== modeId) return false;

      // Only filter by projectId/goalId at the root level.
      // Children inherit lineage from their parent milestone.
      if (parentId === null || parentId === undefined) {
        if (projectId !== undefined && m.projectId !== projectId) return false;
        if (goalId !== undefined && m.goalId !== goalId) return false;
      }

      return true;
    })
    .sort((a, b) => a.position - b.position)
    .map((m) => ({
      ...m,
      // Children are found by parentId only — no project/goal filter
      children: buildMilestoneTree(milestones, modeId, undefined, undefined, m.id),
    }));
}
