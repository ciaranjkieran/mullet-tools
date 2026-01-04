// components/entities/projects/lists/ProjectItem.tsx
"use client";

import { Mode } from "@shared/types/Mode";
import { Task } from "@shared/types/Task";
import { Milestone } from "@shared/types/Milestone";
import { NestedProject } from "../../utils/buildProjectTree";
import ProjectRenderer from "../../renderers/dashboard/ProjectRendererDashboard";
import { useEntityUIStore } from "@/lib/store/useEntityUIStore";
import ProjectList from "./ProjectList";
import TaskSectionDashboard from "@/components/entities/tasks/containers/dashboard/TaskSectionDashboard";
import MilestoneList, {
  type Container as MilestoneContainer,
} from "@/components/entities/milestones/containers/dashboard/MilestoneList";

import {
  makeMilestoneMaps,
  milestoneEffectiveProjectId,
} from "@shared/lineage/effective";

type Props = {
  project: NestedProject;
  parentId: number | null;
  depth: number;
  mode: Mode;
  modes: Mode[];
  tasks: Task[];
  milestones?: Milestone[];
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
};

export default function ProjectItem({
  project,
  parentId,
  depth,
  mode,
  modes,
  tasks,
  milestones = [],
  dragHandleProps,
}: Props) {
  const collapsed = !!useEntityUIStore(
    (s) => s.collapsed.project?.[project.id]
  );
  const modeColor = modes.find((m) => m.id === project.modeId)?.color ?? "#000";

  const childTasks = tasks
    .filter(
      (t) =>
        t.modeId === mode.id && t.projectId === project.id && !t.milestoneId
    )
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  const msMap = makeMilestoneMaps(milestones).byId;
  const projectMilestoneRoots = milestones.filter(
    (m) =>
      milestoneEffectiveProjectId(m.id, msMap) === project.id &&
      m.parentId == null
  );

  const children = (project as any).children ?? [];

  return (
    <div className="space-y-2" style={{ paddingLeft: depth * 16 }}>
      <ProjectRenderer
        project={project}
        mode={mode}
        dragHandleProps={dragHandleProps}
        modeColor={modeColor}
      />

      {!collapsed && (
        <div className="mt-2 space-y-4">
          <TaskSectionDashboard
            tasks={childTasks}
            mode={mode}
            modes={modes}
            projectId={project.id}
          />

          {projectMilestoneRoots.length > 0 && (
            <MilestoneList
              parentId={null}
              milestones={projectMilestoneRoots as any}
              depth={depth + 1}
              mode={mode}
              modes={modes}
              tasks={tasks}
              container={
                { kind: "project", id: project.id } as MilestoneContainer
              }
            />
          )}

          {children.length > 0 && (
            <ProjectList
              parentId={project.id}
              projects={children}
              depth={depth + 1}
              mode={mode}
              modes={modes}
              tasks={tasks}
              milestones={milestones}
              container={{ kind: "project", id: project.id }}
            />
          )}
        </div>
      )}
    </div>
  );
}
