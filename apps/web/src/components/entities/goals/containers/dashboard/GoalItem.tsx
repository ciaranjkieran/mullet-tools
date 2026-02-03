// components/entities/goals/containers/dashboard/GoalItem.tsx
"use client";

import { useMemo } from "react";
import { Mode } from "@shared/types/Mode";
import { Task } from "@shared/types/Task";
import { Milestone } from "@shared/types/Milestone";
import { Project } from "@shared/types/Project";
import { Goal } from "@shared/types/Goal";

import GoalRenderer from "../../renderers/dashboard/GoalRendererDashboard";
import { useEntityUIStore } from "@/lib/store/useEntityUIStore";

import TaskSectionDashboard from "@/components/entities/tasks/containers/dashboard/TaskSectionDashboard";
import MilestoneList, {
  type Container as MilestoneContainer,
} from "@/components/entities/milestones/containers/dashboard/MilestoneList";

import ProjectList from "@/components/entities/projects/containers/dashboard/ProjectList";
import { buildProjectTree } from "@/components/entities/projects/utils/buildProjectTree";

import {
  makeMilestoneMaps,
  makeProjectMaps,
  milestoneEffectiveParentId,
  milestoneEffectiveProjectId,
  milestoneEffectiveGoalId,
} from "@shared/lineage/effective";

/** Compute a project's effective goal by walking up parent->... */
function makeProjectIndex(projects: Project[]) {
  const byId = new Map<number, Project>();
  for (const p of projects) byId.set(p.id, p);
  return byId;
}
function effectiveProjectGoalId(
  projectId: number,
  byId: Map<number, Project>,
): number | null {
  let cur = byId.get(projectId);
  const seen = new Set<number>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    if (cur.goalId != null) return cur.goalId;
    if (cur.parentId == null) break;
    cur = byId.get(cur.parentId);
  }
  return null;
}

type Props = {
  goal: Goal;
  depth: number;
  mode: Mode;
  modes: Mode[];
  tasks: Task[];
  milestones: Milestone[];
  projects: Project[];
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
};

export default function GoalItem({
  goal,
  depth,
  mode,
  modes,
  tasks,
  milestones,
  projects,
  dragHandleProps,
}: Props) {
  // ✅ Don't early return before hooks
  const goalId = goal?.id ?? -1;
  const hasValidGoalId = goalId > 0;

  // Hooks must always run
  const collapsed = useEntityUIStore((s) =>
    hasValidGoalId ? !!s.collapsed.goal?.[goalId] : false,
  );

  const modeColor = useMemo(() => {
    // safe even if goal.modeId is undefined-ish
    return modes.find((m) => m.id === goal.modeId)?.color ?? "#000";
  }, [modes, goal.modeId]);

  // Tasks directly under this goal (no project/milestone)
  const goalTasks = useMemo(() => {
    if (!hasValidGoalId) return [];
    return tasks
      .filter(
        (t) =>
          t.modeId === mode.id &&
          t.goalId === goalId &&
          t.projectId == null &&
          t.milestoneId == null,
      )
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }, [tasks, mode.id, goalId, hasValidGoalId]);

  type NestedMilestone = Milestone & { children: NestedMilestone[] };

  const milestoneTree = useMemo(() => {
    if (!hasValidGoalId) return [] as NestedMilestone[];

    const { byId: msById } = makeMilestoneMaps(milestones);
    const { byId: prById } = makeProjectMaps(projects);

    const candidates: Milestone[] = [];
    for (const m of milestones) {
      const effProj = milestoneEffectiveProjectId(m.id, msById);
      if (effProj != null) continue;
      const effGoal = milestoneEffectiveGoalId(m.id, msById, prById);
      if (effGoal === goalId) candidates.push(m);
    }

    const nodes = new Map<number, NestedMilestone>();
    for (const m of candidates) nodes.set(m.id, { ...m, children: [] });

    const roots: NestedMilestone[] = [];
    for (const n of nodes.values()) {
      const effParent = milestoneEffectiveParentId(n.id, msById);
      if (effParent != null && nodes.has(effParent)) {
        nodes.get(effParent)!.children.push(n);
      } else {
        roots.push(n);
      }
    }

    return roots;
  }, [milestones, projects, goalId, hasValidGoalId]);

  // Projects under THIS goal, including ones that inherit the goal via a parent project
  const projectTree = useMemo(() => {
    if (!hasValidGoalId) return [];

    const byId = makeProjectIndex(projects);
    const belongToGoal = projects.filter((p) => {
      const eff = p.goalId ?? effectiveProjectGoalId(p.id, byId);
      return eff === goalId;
    });

    return buildProjectTree(belongToGoal, null);
  }, [projects, goalId, hasValidGoalId]);

  // ✅ Now it's safe to bail
  if (!hasValidGoalId) {
    console.warn("GoalItem: missing goal.id", goal);
    return null;
  }

  return (
    <div
      className="space-y-2"
      style={{
        marginLeft: `calc(${depth} * var(--tree-indent-multiplier, 16) * 1px)`,
      }}
    >
      {" "}
      <GoalRenderer
        goal={goal}
        mode={mode}
        dragHandleProps={dragHandleProps}
        modeColor={modeColor}
      />
      {!collapsed && (
        <div className="mt-2 space-y-4">
          <TaskSectionDashboard
            tasks={goalTasks}
            mode={mode}
            modes={modes}
            goalId={goalId}
          />

          {milestoneTree.length > 0 && (
            <MilestoneList
              parentId={null}
              milestones={milestoneTree}
              depth={depth + 1}
              mode={mode}
              modes={modes}
              tasks={tasks}
              container={{ kind: "goal", id: goalId } as MilestoneContainer}
            />
          )}

          {projectTree.length > 0 && (
            <ProjectList
              parentId={null}
              projects={projectTree}
              depth={depth + 1}
              mode={mode}
              modes={modes}
              tasks={tasks}
              milestones={milestones}
              container={{ kind: "goal", id: goalId }}
            />
          )}
        </div>
      )}
    </div>
  );
}
