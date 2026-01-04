"use client";

import { Mode } from "@shared/types/Mode";
import { Task } from "@shared/types/Task";
import { Milestone } from "@shared/types/Milestone";
import { Project } from "@shared/types/Project";
import { Goal } from "@shared/types/Goal";
import GoalListUnscheduledDnd from "./GoalListUnscheduledDnd";
import GoalScheduledList from "./GoalScheduledList";

type Props = {
  goals: Goal[];
  depth: number;
  mode: Mode;
  modes: Mode[];
  tasks: Task[];
  milestones: Milestone[];
  projects: Project[];
};

export default function GoalList({
  goals,
  depth,
  mode,
  modes,
  tasks,
  milestones,
  projects,
}: Props) {
  if (!goals.length) return null;

  const unscheduled = goals.filter((g) => !g.dueDate);
  const scheduled = goals.filter((g) => !!g.dueDate);

  return (
    <div className="space-y-4">
      {scheduled.length > 0 && (
        <GoalScheduledList
          goals={scheduled}
          depth={depth}
          mode={mode}
          modes={modes}
          tasks={tasks}
          milestones={milestones}
          projects={projects}
        />
      )}

      {unscheduled.length > 0 && (
        <GoalListUnscheduledDnd
          goals={unscheduled}
          depth={depth}
          mode={mode}
          modes={modes}
          tasks={tasks}
          milestones={milestones}
          projects={projects}
        />
      )}
    </div>
  );
}
