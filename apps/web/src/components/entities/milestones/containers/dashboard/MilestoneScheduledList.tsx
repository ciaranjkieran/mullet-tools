// MilestoneScheduledList.tsx
"use client";

import { NestedMilestone } from "../../utils/MilestoneTreeBuilder";
import { Mode } from "@shared/types/Mode";
import { Task } from "@shared/types/Task";
import MilestoneItem from "./MilestoneItem";
import { useEntityUIStore } from "@/lib/store/useEntityUIStore";

type Props = {
  milestones: NestedMilestone[]; // SCHEDULED only (already filtered)
  depth: number;
  mode: Mode;
  modes: Mode[];
  tasks: Task[];
};

export default function MilestoneScheduledList({
  milestones,
  depth,
  mode,
  modes,
  tasks,
}: Props) {
  const sorted = [...milestones].sort((a, b) =>
    String(a.dueDate).localeCompare(String(b.dueDate))
  );

  return (
    <div className="space-y-2">
      {sorted.map((m) => (
        <MilestoneItem
          key={m.id}
          milestone={m}
          parentId={null /* not used for scheduled reordering */}
          depth={depth}
          mode={mode}
          modes={modes}
          tasks={tasks}
        />
      ))}
    </div>
  );
}
