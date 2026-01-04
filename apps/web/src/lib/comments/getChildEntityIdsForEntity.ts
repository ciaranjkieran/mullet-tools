// lib/comments/getChildEntityIdsForEntity.ts

import { Task } from "@shared/types/Task";
import { Milestone } from "@shared/types/Milestone";
import { Project } from "@shared/types/Project";

/**
 * Returns IDs of child entities (tasks, milestones, projects) associated with a parent entity.
 */
export function getChildEntityIdsForEntity(
  entityType: "milestone" | "project" | "goal",
  entityId: number,
  {
    tasks = [],
    milestones = [],
    projects = [],
  }: {
    tasks?: Task[];
    milestones?: Milestone[];
    projects?: Project[];
  }
): {
  taskIds: number[];
  milestoneIds?: number[];
  projectIds?: number[];
} {
  if (entityType === "milestone") {
    const taskIds = tasks
      .filter((t) => t.milestoneId != null && t.milestoneId === entityId)
      .map((t) => t.id);
    return { taskIds };
  }

  if (entityType === "project") {
    const milestoneIds = milestones
      .filter((m) => m.projectId != null && m.projectId === entityId)
      .map((m) => m.id);

    const taskIds = tasks
      .filter(
        (t) =>
          (t.projectId != null && t.projectId === entityId) ||
          (t.milestoneId != null && milestoneIds.includes(t.milestoneId))
      )
      .map((t) => t.id);

    return { taskIds, milestoneIds };
  }

  if (entityType === "goal") {
    const projectIds = projects
      .filter((p) => p.goalId != null && p.goalId === entityId)
      .map((p) => p.id);

    const milestoneIds = milestones
      .filter((m) => m.projectId != null && projectIds.includes(m.projectId))
      .map((m) => m.id);

    const taskIds = tasks
      .filter(
        (t) =>
          (t.projectId != null && projectIds.includes(t.projectId)) ||
          (t.milestoneId != null && milestoneIds.includes(t.milestoneId))
      )
      .map((t) => t.id);

    return { taskIds, milestoneIds, projectIds };
  }

  return { taskIds: [] };
}
