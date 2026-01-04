// MilestoneListDashboard.tsx
"use client";

import { Milestone } from "@shared/types/Milestone";
import { Task } from "@shared/types/Task";
import { Mode } from "@shared/types/Mode";
import { buildMilestoneTree } from "../../utils/MilestoneTreeBuilder";
import MilestoneList from "./MilestoneList";

type Props = {
  milestones: Milestone[];
  tasks: Task[];
  mode: Mode;
  modes: Mode[];
};

export default function MilestoneListDashboard({
  milestones,
  mode,
  modes,
  tasks,
}: Props) {
  const rootSiblings = buildMilestoneTree(milestones, mode.id); // top-level milestones in this mode
  return (
    <div className="space-y-4 mt-3">
      <MilestoneList
        parentId={null}
        milestones={rootSiblings}
        depth={0}
        mode={mode}
        modes={modes}
        tasks={tasks}
      />
    </div>
  );
}
