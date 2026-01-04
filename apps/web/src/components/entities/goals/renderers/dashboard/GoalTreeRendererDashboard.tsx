// components/entities/goals/renderers/dashboard/GoalTreeRendererDashboard.tsx
"use client";

import { useMemo } from "react";
import { Goal } from "@shared/types/Goal";
import { Mode } from "@shared/types/Mode";
import { Task } from "@shared/types/Task";
import { Project } from "@shared/types/Project";
import { Milestone } from "@shared/types/Milestone";

import ProjectList from "@/components/entities/projects/containers/dashboard/ProjectList";
import { buildProjectTree } from "@/components/entities/projects/utils/buildProjectTree";

import MilestoneList from "@/components/entities/milestones/containers/dashboard/MilestoneList";
import { buildMilestoneTree } from "@/components/entities/milestones/utils/MilestoneTreeBuilder";

import GoalCardDragDashboard from "../../dnd/dashboard/GoalCardDragDashboard";
import TaskSectionDashboard from "@/components/entities/tasks/containers/dashboard/TaskSectionDashboard";

// NEW: lineage helpers (transitive)
import {
  projectEffectiveGoalId,
  milestoneEffectiveGoalId,
  milestoneEffectiveProjectId,
} from "@shared/lineage/effective";

/** Collapsed state types coming from GoalTreeStateProvider */
type CollapsedMap = {
  goal?: Record<number, boolean>;
  project?: Record<number, boolean>;
  milestone?: Record<number, boolean>;
};
type ToggleCollapse = (
  kind: "goal" | "project" | "milestone",
  id: number
) => void;

type Props = {
  goal: Goal;
  mode: Mode;
  modes: Mode[];
  projects: Project[];
  tasks: Task[];
  milestones: Milestone[];
  /** provided by GoalTreeStateProvider */
  collapsedMap?: CollapsedMap;
  toggleCollapse?: ToggleCollapse;
};

export default function GoalTreeRendererDashboard({
  goal,
  mode,
  modes,
  projects,
  tasks,
  milestones,
  collapsedMap,
}: Props) {
  // collapse (prefer provider’s map)
  const isCollapsed = !!collapsedMap?.goal?.[goal.id];

  // Maps for O(1) lineage walk-ups
  const projectsById = useMemo(
    () => new Map<number, Project>(projects.map((p) => [p.id, p])),
    [projects]
  );
  const milestonesById = useMemo(
    () => new Map<number, Milestone>(milestones.map((m) => [m.id, m])),
    [milestones]
  );

  /** Projects whose *effective* goal is this goal (includes nested/descendants). */
  const childProjects = useMemo(
    () =>
      projects.filter(
        (p) => projectEffectiveGoalId(p.id, projectsById) === goal.id
      ),
    [projects, projectsById, goal.id]
  );

  // Build nested project tree from that subset
  const projectTree = useMemo(
    () => buildProjectTree(childProjects, null),
    [childProjects]
  );

  /** Tasks flat to this goal (not under milestone/project). */
  const childTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.goalId === goal.id && t.milestoneId == null && t.projectId == null
      ),
    [tasks, goal.id]
  );

  /**
   * Root milestones for this goal:
   *  - parentId == null (root in milestone chain)
   *  - effective project is null (so they live directly under the goal, not a project)
   *  - effective goal == this goal (walks up via milestone or project lineage)
   */
  const rootMilestonesForGoal = useMemo(
    () =>
      milestones.filter((m) => {
        if (m.parentId != null) return false;
        const effProj = milestoneEffectiveProjectId(m.id, milestonesById);
        if (effProj != null) return false;
        const effGoal = milestoneEffectiveGoalId(
          m.id,
          milestonesById,
          projectsById
        );
        return effGoal === goal.id;
      }),
    [milestones, milestonesById, projectsById, goal.id]
  );

  const milestoneTree = useMemo(
    () =>
      buildMilestoneTree(rootMilestonesForGoal, mode.id, undefined, goal.id),
    [rootMilestonesForGoal, mode.id, goal.id]
  );

  return (
    <div className="space-y-2">
      <GoalCardDragDashboard goal={goal} />

      {!isCollapsed && (
        <>
          <TaskSectionDashboard
            tasks={childTasks}
            mode={mode}
            modes={modes}
            goalId={goal.id}
          />

          {milestoneTree.length > 0 && (
            <MilestoneList
              parentId={null}
              milestones={milestoneTree}
              depth={1}
              mode={mode}
              modes={modes}
              tasks={tasks}
              container={{ kind: "goal", id: goal.id }}
            />
          )}

          {projectTree.length > 0 && (
            <ProjectList
              parentId={null}
              projects={projectTree}
              depth={1}
              mode={mode}
              modes={modes}
              tasks={tasks}
              milestones={milestones}
              container={{ kind: "goal", id: goal.id }}
            />
          )}
        </>
      )}
    </div>
  );
}
