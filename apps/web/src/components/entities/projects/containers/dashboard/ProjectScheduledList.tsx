// components/entities/projects/lists/ProjectScheduledList.tsx
"use client";

import { NestedProject } from "../../utils/buildProjectTree";
import { Mode } from "@shared/types/Mode";
import { Task } from "@shared/types/Task";
import { Milestone } from "@shared/types/Milestone";
import ProjectItem from "./ProjectItem";

type Props = {
  projects: NestedProject[]; // SCHEDULED only (already filtered)
  depth: number;
  mode: Mode;
  modes: Mode[];
  tasks: Task[];
  milestones: Milestone[];
};

export default function ProjectScheduledList({
  projects,
  depth,
  mode,
  modes,
  tasks,
  milestones,
}: Props) {
  const sorted = (projects ?? [])
    .filter((p): p is NestedProject => !!p && typeof p.id === "number")
    .sort((a, b) =>
      String(a.dueDate ?? "").localeCompare(String(b.dueDate ?? ""))
    );

  if (!sorted.length) return null;

  return (
    <div className="space-y-2">
      {sorted.map((p) => (
        <ProjectItem
          key={`project-${p.id}`} // stable key
          project={p}
          parentId={null /* not used for scheduled reordering */}
          depth={depth}
          mode={mode}
          modes={modes}
          tasks={tasks}
          milestones={milestones}
        />
      ))}
    </div>
  );
}
