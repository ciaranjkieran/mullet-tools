// components/entities/milestones/tabs/MilestoneStructureTab.tsx
"use client";

import { Mode } from "@shared/types/Mode";
import { Goal } from "@shared/types/Goal";
import { Project } from "@shared/types/Project";
import { Milestone } from "@shared/types/Milestone";
import { Task } from "@shared/types/Task";
import MilestoneTreeRendererDashboard from "@/components/entities/milestones/renderers/dashboard/MilestoneTreeRendererDashboard";
import MilestoneTreeStateProvider from "@/components/entities/milestones/containers/dashboard/MilestoneTreeStateProvider";
import { buildMilestoneTree } from "@/components/entities/milestones/utils/MilestoneTreeBuilder";
import type { CSSProperties } from "react";

type Props = {
  milestone: Milestone;
  tasks: Task[];
  mode: Mode;
  goals: Goal[];
  projects: Project[];
  milestones: Milestone[];
};

export default function MilestoneStructureTab({
  milestone,
  tasks,
  mode,
  milestones,
}: Props) {
  if (!milestone.modeId) return null;

  // ✅ Anchor at this milestone; do NOT filter by projectId/goalId
  //    so descendants with different (effective) project/goal still render.
  const tree = buildMilestoneTree(
    milestones,
    milestone.modeId,
    undefined, // <- was milestone.projectId
    undefined, // <- was milestone.goalId
    milestone.id // anchor parent
  );

  const modeColor = mode.color;
  const scrollbarStyle: CSSProperties & { "--scrollbar-color"?: string } = {
    "--scrollbar-color": modeColor,
  };

  return (
    <div
      className="flex-1 flex flex-col overflow-y-auto scrollbar-thin mb-6"
      style={scrollbarStyle}
    >
      <div className="flex-1 flex flex-col relative overflow-hidden rounded-lg">
        <div
          className="flex-1 flex flex-col overflow-y-auto scrollbar-thin pt-4 pl-4"
          style={scrollbarStyle}
        >
          <div className="px-4 space-y-6 pt-4">
            <MilestoneTreeStateProvider milestones={tree}>
              {() => (
                <MilestoneTreeRendererDashboard
                  milestone={{ ...milestone, children: tree }}
                  depth={0}
                  mode={mode}
                  modes={[mode]}
                  tasks={tasks}
                  dialogOpen={false}
                  variant="title"
                />
              )}
            </MilestoneTreeStateProvider>
          </div>
        </div>
      </div>
    </div>
  );
}
