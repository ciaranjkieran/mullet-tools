// components/entities/projects/lists/ProjectList.tsx
"use client";

import { Mode } from "@shared/types/Mode";
import { Task } from "@shared/types/Task";
import { Milestone } from "@shared/types/Milestone"; // 👈 NEW
import { NestedProject } from "../../utils/buildProjectTree";
import ProjectUnscheduledDnd from "./ProjectListUnscheduledDnd";
import ProjectScheduledList from "./ProjectScheduledList";

export type Container =
  | { kind: "project" | "mode" | "goal"; id: number | null } // 👈 add "goal"
  | undefined;

type Props = {
  parentId: number | null;
  projects: NestedProject[];
  depth: number;
  mode: Mode;
  modes: Mode[];
  tasks: Task[];
  milestones: Milestone[]; // 👈 NEW
  container?: Container;
};

export default function ProjectList({
  parentId,
  projects,
  depth,
  mode,
  modes,
  tasks,
  milestones, // 👈 NEW
  container,
}: Props) {
  if (!projects.length) return null;

  const unscheduled = projects.filter((p) => !p.dueDate);
  const scheduled = projects.filter((p) => !!p.dueDate);

  return (
    <div className="space-y-4">
      {scheduled.length > 0 && (
        <ProjectScheduledList
          projects={scheduled}
          depth={depth}
          mode={mode}
          modes={modes}
          tasks={tasks}
          milestones={milestones} // 👈 pass down
        />
      )}

      {unscheduled.length > 0 && (
        <ProjectUnscheduledDnd
          parentId={parentId}
          projects={unscheduled}
          depth={depth}
          mode={mode}
          modes={modes}
          tasks={tasks}
          milestones={milestones} // 👈 pass down
          container={container}
        />
      )}
    </div>
  );
}
