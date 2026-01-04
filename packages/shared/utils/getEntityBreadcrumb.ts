import { Goal } from "../types/Goal";
import { Milestone } from "../types/Milestone";
import { Project } from "../types/Project";
import { Task } from "../types/Task";

type BreadcrumbOptions = {
  immediateOnly?: boolean;
};

export type Maps = {
  goalMap: Record<number, Goal>;
  projectMap: Record<number, Project>;
  milestoneMap: Record<number, Milestone>;
  taskMap?: Record<number, Task>;
};

export function getEntityBreadcrumb(
  entity: Task | Milestone | Project | Goal,
  { goalMap, projectMap, milestoneMap }: Maps,
  options: BreadcrumbOptions = {}
): string {
  const { immediateOnly = false } = options;

  if (immediateOnly) {
    // Milestone's immediate parent (another milestone)
    if ("projectId" in entity && "parentId" in entity && entity.parentId) {
      const parentMilestone: Milestone | undefined =
        milestoneMap[entity.parentId];
      if (parentMilestone) return parentMilestone.title;
    }

    // Project's immediate parent (another project)
    if (!("projectId" in entity) && "parentId" in entity && entity.parentId) {
      const parentProject: Project | undefined = projectMap[entity.parentId];
      if (parentProject) return parentProject.title;
    }

    // Fall back to direct links
    if ("milestoneId" in entity && entity.milestoneId) {
      return milestoneMap[entity.milestoneId]?.title ?? "";
    }
    if ("projectId" in entity && entity.projectId) {
      return projectMap[entity.projectId]?.title ?? "";
    }
    if ("goalId" in entity && entity.goalId) {
      return goalMap[entity.goalId]?.title ?? "";
    }

    return "";
  }

  const parts: string[] = [];

  // Milestone chain
  if ("milestoneId" in entity && entity.milestoneId) {
    let current: Milestone | undefined = milestoneMap[entity.milestoneId];
    while (current) {
      parts.unshift(current.title);
      current = current.parentId ? milestoneMap[current.parentId] : undefined;
    }
  }

  // Project chain
  if ("projectId" in entity && entity.projectId) {
    let current: Project | undefined = projectMap[entity.projectId];
    while (current) {
      parts.unshift(current.title);
      current = current.parentId ? projectMap[current.parentId] : undefined;
    }
  }

  // Goal
  if ("goalId" in entity && entity.goalId) {
    const goal = goalMap[entity.goalId];
    if (goal) parts.unshift(goal.title);
  }

  return parts.join(" | ");
}
