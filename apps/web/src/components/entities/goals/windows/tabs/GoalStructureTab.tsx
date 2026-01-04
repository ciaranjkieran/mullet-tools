"use client";

import { Goal } from "@shared/types/Goal";
import { Mode } from "@shared/types/Mode";
import { Project } from "@shared/types/Project";
import { Milestone } from "@shared/types/Milestone";
import { Task } from "@shared/types/Task";

import GoalTreeStateProvider from "@/components/entities/goals/containers/dashboard/GoalTreeStateProvider";
import GoalTreeRendererDashboard from "@/components/entities/goals/renderers/dashboard/GoalTreeRendererDashboard";

type Props = {
  goal: Goal;
  mode: Mode;
  projects: Project[];
  milestones: Milestone[];
  tasks: Task[];
};

export default function GoalStructureTab({
  goal,
  mode,
  projects,
  milestones,
  tasks,
}: Props) {
  return (
    <div
      className="flex-1 flex flex-col overflow-y-auto scrollbar-thin mb-6"
      style={{
        ["--scrollbar-color" as any]: mode.color,
      }}
    >
      <div className="flex-1 flex flex-col relative overflow-hidden rounded-lg">
        <div className="flex-1 flex flex-col overflow-y-auto scrollbar-thin pt-4 pl-4">
          <div className="px-4 space-y-6 pt-4">
            <GoalTreeStateProvider goals={[goal]}>
              {({ collapsedMap }) => (
                <GoalTreeRendererDashboard
                  key={goal.id}
                  goal={goal}
                  mode={mode}
                  modes={[mode]}
                  projects={projects}
                  tasks={tasks}
                  milestones={milestones}
                  collapsedMap={collapsedMap}
                />
              )}
            </GoalTreeStateProvider>
          </div>
        </div>
      </div>
    </div>
  );
}
