import { useMemo } from "react";
import type { Mode } from "@shared/types/Mode";
import type { Goal } from "@shared/types/Goal";
import type { Project } from "@shared/types/Project";
import type { Milestone } from "@shared/types/Milestone";
import type { Task } from "@shared/types/Task";
import {
  projectEffectiveGoalId,
  makeProjectMaps,
} from "@shared/lineage/effective";

export type EntityType =
  | "goal"
  | "project"
  | "milestone"
  | "task"
  | "section-header";

export type DashboardRow = {
  key: string;
  entityType: EntityType;
  entity: Goal | Project | Milestone | Task | { id: string; title: string };
  depth: number;
  modeColor: string;
  modeId: number;
  hasChildren?: boolean;
};

const byPos = (a: { position: number }, b: { position: number }) =>
  (a.position ?? 0) - (b.position ?? 0);

const sortModes = (arr: Mode[]) =>
  [...arr].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0) || a.id - b.id
  );

// ── Flatten helpers ──────────────────────────────────────────

function flattenMilestone(
  ms: Milestone,
  depth: number,
  mode: Mode,
  rows: DashboardRow[],
  allMilestones: Milestone[],
  allTasks: Task[],
  collapsed: Record<string, boolean>
) {
  const key = `milestone-${ms.id}`;
  const msTasks = allTasks
    .filter((t) => t.milestoneId === ms.id)
    .sort(byPos);
  const children = allMilestones
    .filter((m) => m.parentId === ms.id)
    .sort(byPos);

  rows.push({
    key,
    entityType: "milestone",
    entity: ms,
    depth,
    modeColor: mode.color,
    modeId: mode.id,
    hasChildren: msTasks.length + children.length > 0,
  });

  if (collapsed[key]) return;

  for (const t of msTasks) {
    rows.push({
      key: `task-${t.id}`,
      entityType: "task",
      entity: t,
      depth: depth + 1,
      modeColor: mode.color,
      modeId: mode.id,
    });
  }

  for (const child of children) {
    flattenMilestone(child, depth + 1, mode, rows, allMilestones, allTasks, collapsed);
  }
}

function flattenProject(
  proj: Project,
  depth: number,
  mode: Mode,
  rows: DashboardRow[],
  allProjects: Project[],
  allMilestones: Milestone[],
  allTasks: Task[],
  collapsed: Record<string, boolean>
) {
  const key = `project-${proj.id}`;
  const projTasks = allTasks
    .filter((t) => t.projectId === proj.id && !t.milestoneId)
    .sort(byPos);
  const projMilestones = allMilestones
    .filter((m) => m.projectId === proj.id && !m.parentId)
    .sort(byPos);
  const childProjects = allProjects
    .filter((p) => p.parentId === proj.id)
    .sort(byPos);

  rows.push({
    key,
    entityType: "project",
    entity: proj,
    depth,
    modeColor: mode.color,
    modeId: mode.id,
    hasChildren: projTasks.length + projMilestones.length + childProjects.length > 0,
  });

  if (collapsed[key]) return;

  for (const t of projTasks) {
    rows.push({
      key: `task-${t.id}`,
      entityType: "task",
      entity: t,
      depth: depth + 1,
      modeColor: mode.color,
      modeId: mode.id,
    });
  }

  for (const ms of projMilestones) {
    flattenMilestone(ms, depth + 1, mode, rows, allMilestones, allTasks, collapsed);
  }

  for (const child of childProjects) {
    flattenProject(child, depth + 1, mode, rows, allProjects, allMilestones, allTasks, collapsed);
  }
}

function flattenGoal(
  goal: Goal,
  depth: number,
  mode: Mode,
  rows: DashboardRow[],
  allProjects: Project[],
  allMilestones: Milestone[],
  allTasks: Task[],
  projectsById: Map<number, Project>,
  collapsed: Record<string, boolean>
) {
  const key = `goal-${goal.id}`;
  const goalTasks = allTasks
    .filter(
      (t) =>
        t.goalId === goal.id && !t.projectId && !t.milestoneId
    )
    .sort(byPos);
  const goalMilestones = allMilestones
    .filter((m) => m.goalId === goal.id && !m.projectId && !m.parentId)
    .sort(byPos);
  const goalProjects = allProjects
    .filter((p) => {
      if (p.parentId) return false;
      const effGoal =
        p.goalId ?? projectEffectiveGoalId(p.id, projectsById);
      return effGoal === goal.id;
    })
    .sort(byPos);

  rows.push({
    key,
    entityType: "goal",
    entity: goal,
    depth,
    modeColor: mode.color,
    modeId: mode.id,
    hasChildren: goalTasks.length + goalMilestones.length + goalProjects.length > 0,
  });

  if (collapsed[key]) return;
  for (const t of goalTasks) {
    rows.push({
      key: `task-${t.id}`,
      entityType: "task",
      entity: t,
      depth: depth + 1,
      modeColor: mode.color,
      modeId: mode.id,
    });
  }

  for (const ms of goalMilestones) {
    flattenMilestone(ms, depth + 1, mode, rows, allMilestones, allTasks, collapsed);
  }

  for (const proj of goalProjects) {
    flattenProject(
      proj,
      depth + 1,
      mode,
      rows,
      allProjects,
      allMilestones,
      allTasks,
      collapsed
    );
  }
}

// ── Main hook ────────────────────────────────────────────────

export function useBuildDashboardRows(
  modes: Mode[],
  goals: Goal[],
  projects: Project[],
  milestones: Milestone[],
  tasks: Task[],
  selectedMode: Mode | "All",
  collapsed: Record<string, boolean>
): DashboardRow[] {
  return useMemo(() => {
    const rows: DashboardRow[] = [];
    const isAll = selectedMode === "All";
    const { byId: projectsById } = makeProjectMaps(projects);

    const activeModes = isAll
      ? sortModes(
          modes.filter((m) => {
            const id = m.id;
            return (
              tasks.some((t) => t.modeId === id) ||
              projects.some((p) => p.modeId === id) ||
              milestones.some((mm) => mm.modeId === id) ||
              goals.some((g) => g.modeId === id)
            );
          })
        )
      : [selectedMode as Mode];

    for (const mode of activeModes) {
      if (isAll) {
        rows.push({
          key: `mode-header-${mode.id}`,
          entityType: "section-header",
          entity: { id: `mode-${mode.id}`, title: mode.title },
          depth: 0,
          modeColor: mode.color,
          modeId: mode.id,
        });
      }

      const baseDepth = isAll ? 1 : 0;

      // 1. Loose tasks (no parent goal/project/milestone)
      const looseTasks = tasks
        .filter(
          (t) =>
            t.modeId === mode.id &&
            !t.goalId &&
            !t.projectId &&
            !t.milestoneId
        )
        .sort(byPos);
      for (const task of looseTasks) {
        rows.push({
          key: `task-${task.id}`,
          entityType: "task",
          entity: task,
          depth: baseDepth,
          modeColor: mode.color,
          modeId: mode.id,
        });
      }

      // 2. Top-level milestones (not under project or goal, no parent)
      const topMilestones = milestones
        .filter(
          (m) =>
            m.modeId === mode.id &&
            !m.projectId &&
            !m.goalId &&
            !m.parentId
        )
        .sort(byPos);
      for (const ms of topMilestones) {
        flattenMilestone(
          ms,
          baseDepth,
          mode,
          rows,
          milestones,
          tasks,
          collapsed
        );
      }

      // 3. Root projects (not under a goal)
      const rootProjects = projects
        .filter(
          (p) =>
            p.modeId === mode.id &&
            !p.parentId &&
            projectEffectiveGoalId(p.id, projectsById) == null
        )
        .sort(byPos);
      for (const proj of rootProjects) {
        flattenProject(
          proj,
          baseDepth,
          mode,
          rows,
          projects,
          milestones,
          tasks,
          collapsed
        );
      }

      // 4. Goals with their nested children
      const goalsInMode = goals
        .filter((g) => g.modeId === mode.id)
        .sort(byPos);
      for (const goal of goalsInMode) {
        flattenGoal(
          goal,
          baseDepth,
          mode,
          rows,
          projects,
          milestones,
          tasks,
          projectsById,
          collapsed
        );
      }
    }

    return rows;
  }, [modes, goals, projects, milestones, tasks, selectedMode, collapsed]);
}
