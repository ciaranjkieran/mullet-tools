// components/entities/milestones/lists/MilestoneList.tsx
"use client";

import { Mode } from "@shared/types/Mode";
import { Task } from "@shared/types/Task";
import { NestedMilestone } from "../../utils/MilestoneTreeBuilder";
import MilestoneUnscheduledDnd from "./MilestoneListUnscheduledDnd";
import MilestoneScheduledList from "./MilestoneScheduledList";

export type Container =
  | { kind: "milestone" | "project" | "goal" | "mode"; id: number | null }
  | undefined;

type Props = {
  parentId: number | null;
  milestones: NestedMilestone[];
  depth: number;
  mode: Mode;
  modes: Mode[];
  tasks: Task[];
  /** 👇 NEW */
  container?: Container;
};

export default function MilestoneList({
  parentId,
  milestones,
  depth,
  mode,
  modes,
  tasks,
  container,
}: Props) {
  if (!milestones.length) return null;

  const unscheduled = milestones.filter((m) => !m.dueDate);
  const scheduled = milestones.filter((m) => !!m.dueDate);

  return (
    <div className="space-y-4">
      {scheduled.length > 0 && (
        <MilestoneScheduledList
          milestones={scheduled}
          depth={depth}
          mode={mode}
          modes={modes}
          tasks={tasks}
        />
      )}
      {unscheduled.length > 0 && (
        <MilestoneUnscheduledDnd
          parentId={parentId}
          milestones={unscheduled}
          depth={depth}
          mode={mode}
          modes={modes}
          tasks={tasks}
          container={container}
        />
      )}
    </div>
  );
}
