"use client";

import { Goal } from "@shared/types/Goal";
import { Task } from "@shared/types/Task";
import { Milestone } from "@shared/types/Milestone";
import { Project } from "@shared/types/Project";
import { Mode } from "@shared/types/Mode";
import GoalList from "./GoalList";

type Props = {
  goals: Goal[];
  tasks: Task[];
  milestones: Milestone[];
  projects: Project[];
  mode: Mode;
  modes: Mode[];
};

export default function GoalListDashboard({
  goals,
  tasks,
  milestones,
  projects,
  mode,
  modes,
}: Props) {
  // If you want top-level only per mode, filter here:
  const inMode = goals.filter((g) => g.modeId === mode.id);

  return (
    <div className="space-y-4 mt-3">
      <GoalList
        goals={inMode}
        depth={0}
        mode={mode}
        modes={modes}
        tasks={tasks}
        milestones={milestones}
        projects={projects}
      />
    </div>
  );
}
