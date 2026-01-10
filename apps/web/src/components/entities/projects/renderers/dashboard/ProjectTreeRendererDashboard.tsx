// components/entities/projects/renderers/dashboard/ProjectTreeRendererDashboard.tsx
"use client";

import { useMemo } from "react";
import { NestedProject } from "../../utils/buildProjectTree";
import { Project } from "@shared/types/Project";
import { Task } from "@shared/types/Task";
import { Mode } from "@shared/types/Mode";
import { Milestone } from "@shared/types/Milestone";

import TaskSectionDashboard from "@/components/entities/tasks/containers/dashboard/TaskSectionDashboard";
import ProjectCardDragDashboard from "../../dnd/dashboard/ProjectCardDragDashboard";

import { buildMilestoneTree } from "@/components/entities/milestones/utils/MilestoneTreeBuilder";
import MilestoneList from "@/components/entities/milestones/containers/dashboard/MilestoneList";
import { useEntityUIStore } from "@/lib/store/useEntityUIStore";

// 🔗 NEW: lineage helper for transitive project lookup
import { milestoneEffectiveProjectId } from "@shared/lineage/effective";

type Props = {
  project: NestedProject;
  depth: number;
  mode: Mode;
  modes: Mode[];
  milestones: Milestone[];
  tasks: Task[];
  onEditProject?: (project: Project) => void;
  onEditTask?: (task: Task) => void;
  onEditMilestone?: (milestone: Milestone) => void;
  dialogOpen?: boolean;
  variant?: undefined | "title";
};

export default function ProjectTreeRendererDashboard({
  project,
  depth,
  mode,
  modes,
  milestones,
  tasks,
  onEditProject,
  onEditTask,
  onEditMilestone,
  dialogOpen,
  variant,
}: Props) {
  const isCollapsed = useEntityUIStore(
    (s) => !!s.collapsed.project?.[project.id]
  );

  // Tasks directly under this project (milestone tasks are rendered under their milestone)
  const childTasks = useMemo(() => {
    const safeTasks = tasks ?? [];
    return safeTasks.filter(
      (t) => t.projectId === project.id && !t.milestoneId
    );
  }, [tasks, project.id]);

  // Build a Map for O(1) milestone lookups during effective traversal
  const milestonesById = useMemo(() => {
    const safeMilestones = milestones ?? [];
    return new Map<number, Milestone>(safeMilestones.map((m) => [m.id, m]));
  }, [milestones]);

  // ✅ Milestones whose *effective* project is this project (transitive via milestone parents)
  const childMilestones = useMemo(() => {
    const safeMilestones = milestones ?? [];
    return safeMilestones.filter(
      (m) => milestoneEffectiveProjectId(m.id, milestonesById) === project.id
    );
  }, [milestones, milestonesById, project.id]);

  // AFTER (no projectId → no direct re-filtering)
  const milestoneTree = useMemo(
    () =>
      buildMilestoneTree(childMilestones, mode.id, undefined /* projectId */),
    [childMilestones, mode.id]
  );

  return (
    <div className="space-y-2" style={{ marginLeft: `${depth * 16}px` }}>
      <ProjectCardDragDashboard
        project={project}
        onEdit={onEditProject}
        dialogOpen={dialogOpen}
        variant={variant}
      />

      {!isCollapsed && (
        <div className="space-y-2">
          <TaskSectionDashboard
            tasks={childTasks}
            mode={mode}
            modes={modes}
            onEditTask={onEditTask}
            projectId={project.id}
          />

          {milestoneTree.length > 0 && (
            <MilestoneList
              parentId={null} // top-level within this project's scope
              milestones={milestoneTree}
              depth={depth + 1} // indent below the project row
              mode={mode}
              modes={modes}
              tasks={tasks}
              container={{ kind: "project", id: project.id }} // ensures correct collapse scope
            />
          )}

          {project.children.map((child) => (
            <ProjectTreeRendererDashboard
              key={child.id}
              project={child}
              depth={depth + 1}
              mode={mode}
              modes={modes}
              milestones={milestones}
              tasks={tasks}
              onEditProject={onEditProject}
              onEditTask={onEditTask}
              onEditMilestone={onEditMilestone}
              dialogOpen={dialogOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
}
