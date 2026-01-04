// @shared/lineage/toTimerPath.ts
import { TimerPath } from "../../../apps/web/src/lib/utils/userTimerIntentStore";
import type { Mode } from "../types/Mode";
import type { Goal } from "../types/Goal";
import type { Project } from "../types/Project";
import type { Milestone } from "../types/Milestone";
import type { Task } from "../types/Task";
import {
  projectEffectiveGoalId,
  milestoneEffectiveProjectId,
  milestoneEffectiveGoalId,
} from "./effective";

type Maps = {
  modesById: Map<number, Mode>;
  goalsById: Map<number, Goal>;
  projectsById: Map<number, Project>;
  milestonesById: Map<number, Milestone>;
  tasksById: Map<number, Task>;
};

export type EntityRef =
  | { kind: "mode"; id: number }
  | { kind: "goal"; id: number }
  | { kind: "project"; id: number }
  | { kind: "milestone"; id: number }
  | { kind: "task"; id: number };

export function toTimerPath(ref: EntityRef, m: Maps): TimerPath {
  switch (ref.kind) {
    case "mode":
      return {
        modeId: ref.id,
        goalId: null,
        projectId: null,
        milestoneId: null,
        taskId: null,
      };

    case "goal": {
      const goal = m.goalsById.get(ref.id);
      const modeId = goal?.modeId ?? null;
      return {
        modeId,
        goalId: ref.id,
        projectId: null,
        milestoneId: null,
        taskId: null,
      };
    }

    case "project": {
      const project = m.projectsById.get(ref.id);
      const modeId = project?.modeId ?? null;
      const goalId =
        projectEffectiveGoalId(project?.id ?? null, m.projectsById) ?? null;
      return {
        modeId,
        goalId,
        projectId: ref.id,
        milestoneId: null,
        taskId: null,
      };
    }

    case "milestone": {
      const ms = m.milestonesById.get(ref.id);
      const modeId = ms?.modeId ?? null;
      const projectId =
        milestoneEffectiveProjectId(ms?.id ?? null, m.milestonesById) ?? null;
      const goalId =
        milestoneEffectiveGoalId(
          ms?.id ?? null,
          m.milestonesById,
          m.projectsById
        ) ?? null;
      return { modeId, goalId, projectId, milestoneId: ref.id, taskId: null };
    }

    // @shared/lineage/toTimerPath.ts

    case "task": {
      const t = m.tasksById.get(ref.id);
      const modeId = t?.modeId ?? null;

      const milestoneId = t?.milestoneId ?? null;

      // 🔧 FIX: derive projectId via milestone chain when task.projectId is null
      let projectId: number | null = null;

      if (milestoneId != null) {
        // climb nested milestones until we find the owning project
        projectId =
          milestoneEffectiveProjectId(milestoneId, m.milestonesById) ?? null;
      } else {
        projectId = t?.projectId ?? null;
      }

      const goalId =
        t?.goalId ??
        (milestoneId
          ? milestoneEffectiveGoalId(
              milestoneId,
              m.milestonesById,
              m.projectsById
            ) ?? null
          : projectId
          ? projectEffectiveGoalId(projectId, m.projectsById) ?? null
          : null);

      return { modeId, goalId, projectId, milestoneId, taskId: ref.id };
    }
  }
}
