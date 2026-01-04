// inferCascade.ts

import { Milestone } from "@/types/Milestone";
import { Project } from "@/types/Project";

/**
 * Only cascade if a real milestone is selected. If `null`, return without chaining up.
 */
export function inferCascadeFromMilestone(
  milestoneId: number | null | undefined,
  milestones: Milestone[],
  projects: Project[]
): { projectId: number | null; goalId: number | null } {
  if (milestoneId == null) {
    return { projectId: null, goalId: null };
  }

  const milestone = milestones.find((m) => m.id === milestoneId);
  if (!milestone) return { projectId: null, goalId: null };

  // If the milestone has no projectId, stop chaining up
  if (milestone.projectId == null) return { projectId: null, goalId: null };

  const project = projects.find((p) => p.id === milestone.projectId);
  return {
    projectId: milestone.projectId,
    goalId: project?.goalId ?? null,
  };
}

/**
 * Only cascade if a real project is selected. If `null`, return without chaining up.
 */
export function inferCascadeFromProject(
  projectId: number | null | undefined,
  projects: Project[]
): { goalId: number | null } {
  if (projectId == null) {
    return { goalId: null };
  }

  const project = projects.find((p) => p.id === projectId);
  return { goalId: project?.goalId ?? null };
}
