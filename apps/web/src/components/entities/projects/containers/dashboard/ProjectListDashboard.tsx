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

// Minimal nested milestone shape for MilestoneList
type NestedMilestone = Milestone & { children: NestedMilestone[] };

type ProjectWithChildren = NestedProject & { children?: NestedProject[] };
function hasProjectChildren(p: NestedProject): p is ProjectWithChildren {
  return (
    typeof p === "object" &&
    p !== null &&
    "children" in p &&
    Array.isArray((p as Record<string, unknown>).children)
  );
}

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
  // keep prop for compatibility / future use
  void parentId;

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

  // Roots = milestones effectively in this project AND with no parent
  // Convert to NestedMilestone nodes so MilestoneList doesn't need any-casts
  const projectMilestoneRoots: NestedMilestone[] = milestones
    .filter(
      (m) =>
        milestoneEffectiveProjectId(m.id, msMap) === project.id &&
        m.parentId == null
    )
    .map((m) => ({ ...m, children: [] }));

  const children: NestedProject[] = hasProjectChildren(project)
    ? project.children ?? []
    : [];

  return (
    <div className="space-y-2" style={{ paddingLeft: depth * 16 }}>
      <ProjectRenderer
        project={project}
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
              milestones={projectMilestoneRoots}
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
