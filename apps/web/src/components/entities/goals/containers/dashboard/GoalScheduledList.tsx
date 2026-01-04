"use client";

import { Mode } from "@shared/types/Mode";
import { Task } from "@shared/types/Task";
import { Milestone } from "@shared/types/Milestone";
import { Project } from "@shared/types/Project";
import { Goal } from "@shared/types/Goal";
import GoalItem from "./GoalItem";

type Props = {
  goals: Goal[]; // SCHEDULED only (already filtered)
  depth: number;
  mode: Mode;
  modes: Mode[];
  tasks: Task[];
  milestones: Milestone[];
  projects: Project[];
};

export default function GoalScheduledList({
  goals,
  depth,
  mode,
  modes,
  tasks,
  milestones,
  projects,
}: Props) {
  const sorted = [...goals].sort((a, b) =>
    String(a.dueDate).localeCompare(String(b.dueDate))
  );

  return (
    <div className="space-y-2">
      {sorted.map((g) => (
        <GoalItem
          key={g.id}
          goal={g}
          depth={depth}
          mode={mode}
          modes={modes}
          tasks={tasks}
          milestones={milestones}
          projects={projects}
        />
      ))}
    </div>
  );
}
