// @shared/lineage/derive.ts
import type { Project } from "../types/Project";
import type { Milestone } from "../types/Milestone";

import {
  milestoneEffectiveGoalId,
  milestoneEffectiveProjectId,
  projectEffectiveGoalId,
} from "./effective";

/* Simple typed Maps interface your UI can pass down */
export type ProjectMaps = {
  byId: Map<number, Project>;
};
export type MilestoneMaps = {
  byId: Map<number, Milestone>;
};

type Maps = {
  projectsById: Map<number, Project>;
  milestonesById: Map<number, Milestone>;
};

/* ─────────────────────────────────────────────────────────
   Project derivations for displays
   ───────────────────────────────────────────────────────── */

/**
 * Given a selected parent project, derive the *effective* goal it implies,
 * respecting deep nesting (grandparents, etc.).
 */
export function deriveGoalFromParentProject(
  parentProjectId: number | null | undefined,
  projectsById: Map<number, Project>
): { effectiveGoalId: number | null } {
  const effectiveGoalId =
    parentProjectId != null
      ? projectEffectiveGoalId(parentProjectId, projectsById)
      : null;
  return { effectiveGoalId };
}

/**
 * Build a project display snapshot:
 * - If a parent is selected, compute its implied (effective) goal.
 * - If no parent, just reflect the manually selected goal (can be null).
 *
 * This is display-only; do not use to mutate stored state.
 */
export function buildProjectDisplay(
  args: {
    parentId: number | null | undefined;
    goalId: number | null | undefined;
  },
  maps: { projectsById: Map<number, Project> }
) {
  const { parentId, goalId } = args;

  if (parentId != null) {
    const { effectiveGoalId } = deriveGoalFromParentProject(
      parentId,
      maps.projectsById
    );
    return {
      source: "parent" as const,
      displayParentId: parentId,
      displayGoalId: effectiveGoalId,
    };
  }

  return {
    source: goalId != null ? ("goal" as const) : ("none" as const),
    displayParentId: null as number | null,
    displayGoalId: (goalId ?? null) as number | null,
  };
}

/* ─────────────────────────────────────────────────────────
   Milestone derivations for displays
   ───────────────────────────────────────────────────────── */

/**
 * Given a selected milestone, derive its effective project and goal by
 * walking the milestone chain and (when found) the project chain.
 */
export function deriveFromMilestone(
  milestoneId: number | null | undefined,
  maps: Maps
): {
  effectiveProjectId: number | null;
  effectiveGoalId: number | null;
} {
  const { milestonesById, projectsById } = maps;

  const effectiveProjectId = milestoneEffectiveProjectId(
    milestoneId,
    milestonesById
  );

  const effectiveGoalId = milestoneEffectiveGoalId(
    milestoneId,
    milestonesById,
    projectsById
  );

  return { effectiveProjectId, effectiveGoalId };
}

/**
 * Build a milestone display snapshot for editors:
 * - If a parent milestone is chosen, show the effective project & goal it implies.
 * - If user picked a project manually, show that and its effective goal.
 * - If user picked a goal manually (with no project), just show that goal.
 *
 * This is for display only; the UI’s stored state should remain the single source of truth.
 */
export function buildMilestoneDisplay(
  args: {
    parentMilestoneId: number | null | undefined;
    projectId: number | null | undefined;
    goalId: number | null | undefined;
  },
  maps: Maps
) {
  const { parentMilestoneId, projectId, goalId } = args;
  const { projectsById, milestonesById } = maps;

  // 1) Parent milestone implies lineage
  if (parentMilestoneId != null) {
    const effProjectId = milestoneEffectiveProjectId(
      parentMilestoneId,
      milestonesById
    );
    const effGoalId = milestoneEffectiveGoalId(
      parentMilestoneId,
      milestonesById,
      projectsById
    );
    return {
      source: "parent-milestone" as const,
      displayParentMilestoneId: parentMilestoneId,
      displayProjectId: effProjectId,
      displayGoalId: effGoalId,
    };
  }

  // 2) Manual project implies an effective goal
  if (projectId != null) {
    const effGoalId = projectEffectiveGoalId(projectId, projectsById);
    return {
      source: "project" as const,
      displayParentMilestoneId: null as number | null,
      displayProjectId: projectId,
      displayGoalId: effGoalId,
    };
  }

  // 3) Manual goal only
  return {
    source: goalId != null ? ("goal" as const) : ("none" as const),
    displayParentMilestoneId: null as number | null,
    displayProjectId: null as number | null,
    displayGoalId: (goalId ?? null) as number | null,
  };
}

type TaskDeriveArgs = {
  milestoneId: number | null | undefined;
  projectId: number | null | undefined;
  goalId: number | null | undefined;
  maps: {
    projectsById: Map<number, Project>;
    milestonesById: Map<number, Milestone>;
  };
};

/**
 * Display-only lineage for Task editors:
 * - If milestone is chosen, show its effective project & goal.
 * - Else if project is chosen, show it and its effective goal.
 * - Else show the goal (or none).
 */
export function deriveTaskDisplay({
  milestoneId,
  projectId,
  goalId,
  maps,
}: TaskDeriveArgs) {
  const { projectsById, milestonesById } = maps;

  if (milestoneId != null) {
    const effProjectId = milestoneEffectiveProjectId(
      milestoneId,
      milestonesById
    );
    const effGoalId = milestoneEffectiveGoalId(
      milestoneId,
      milestonesById,
      projectsById
    );
    return {
      source: "milestone" as const,
      displayMilestoneId: milestoneId,
      displayProjectId: effProjectId,
      displayGoalId: effGoalId,
    };
  }

  if (projectId != null) {
    const effGoalId = projectEffectiveGoalId(projectId, projectsById);
    return {
      source: "project" as const,
      displayMilestoneId: null as number | null,
      displayProjectId: projectId,
      displayGoalId: effGoalId,
    };
  }

  return {
    source: goalId != null ? ("goal" as const) : ("none" as const),
    displayMilestoneId: null as number | null,
    displayProjectId: null as number | null,
    displayGoalId: (goalId ?? null) as number | null,
  };
}
