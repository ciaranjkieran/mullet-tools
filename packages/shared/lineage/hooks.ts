import { useMemo } from "react";
import { Goal } from "../types/Goal";
import { Project } from "../types/Project";
import { Milestone } from "../types/Milestone";
import { buildMaps } from "./maps";
import {
  buildMilestoneDisplay,
  buildProjectDisplay,
  deriveTaskDisplay,
} from "./derive";

/** Normalize a Record<number, T> | Map<number, T> into Map<number, T>. */
function toMap<T>(
  objOrMap: Record<number, T> | Map<number, T>
): Map<number, T> {
  if (objOrMap instanceof Map) return objOrMap;
  // Convert object keys (strings) to numeric ids
  return new Map<number, T>(
    Object.entries(objOrMap).map(([k, v]) => [Number(k), v as T])
  );
}

export function useMaps(
  goals: Goal[],
  projects: Project[],
  milestones: Milestone[]
) {
  // Keep your existing buildMaps, then normalize the byId shapes to Map
  return useMemo(() => {
    const raw = buildMaps(goals, projects, milestones) as any;
    return {
      ...raw,
      projectsById: toMap<Project>(raw.projectsById),
      milestonesById: toMap<Milestone>(raw.milestonesById),
      goalsById: raw.goalsById ? toMap<Goal>(raw.goalsById) : undefined,
    };
  }, [goals, projects, milestones]);
}

export function useMilestoneDisplayChain(
  parentId: number | null | undefined,
  projectId: number | null | undefined,
  goalId: number | null | undefined,
  goals: Goal[],
  projects: Project[],
  milestones: Milestone[]
) {
  const maps = useMaps(goals, projects, milestones);
  return useMemo(
    () =>
      buildMilestoneDisplay(
        {
          parentMilestoneId: parentId,
          projectId,
          goalId,
        },
        {
          projectsById: maps.projectsById,
          milestonesById: maps.milestonesById,
        }
      ),
    [parentId, projectId, goalId, maps]
  );
}

export function useTaskDisplayChain(
  milestoneId: number | null | undefined,
  projectId: number | null | undefined,
  goalId: number | null | undefined,
  goals: Goal[],
  projects: Project[],
  milestones: Milestone[]
) {
  const maps = useMaps(goals, projects, milestones);
  return useMemo(
    () =>
      deriveTaskDisplay({
        milestoneId,
        projectId,
        goalId,
        maps: {
          projectsById: maps.projectsById,
          milestonesById: maps.milestonesById,
        },
      }),
    [milestoneId, projectId, goalId, maps]
  );
}

export function useProjectDisplayChain(
  parentId: number | null | undefined,
  goalId: number | null | undefined,
  goals: Goal[],
  projects: Project[],
  milestones: Milestone[]
) {
  const maps = useMaps(goals, projects, milestones);
  return useMemo(
    () =>
      buildProjectDisplay(
        { parentId, goalId },
        { projectsById: maps.projectsById }
      ),
    [parentId, goalId, maps]
  );
}
