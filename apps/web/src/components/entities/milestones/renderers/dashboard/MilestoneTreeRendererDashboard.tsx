// components/entities/milestones/renderers/dashboard/MilestoneTreeRendererDashboard.tsx
"use client";

import { useMemo } from "react";
import { Mode } from "@shared/types/Mode";
import { Task } from "@shared/types/Task";
import { Milestone } from "@shared/types/Milestone";

import { NestedMilestone } from "../../utils/MilestoneTreeBuilder";
import TaskSectionDashboard from "@/components/entities/tasks/containers/dashboard/TaskSectionDashboard";
import MilestoneCardDragDashboard from "../../dnd/dashboard/MilestoneCardDragDashboard";
import { useEntityUIStore } from "@/lib/store/useEntityUIStore";

type Props = {
  milestone: NestedMilestone;
  depth: number;
  mode: Mode;
  modes: Mode[];
  tasks: Task[];
  onEditMilestone?: (milestone: Milestone) => void;
  onEditTask?: (task: Task) => void;
  dialogOpen?: boolean;
  variant?: undefined | "title";
};

export default function MilestoneTreeRendererDashboard({
  milestone,
  depth,
  mode,
  modes,
  tasks,
  onEditMilestone,
  onEditTask,
  dialogOpen,
  variant,
}: Props) {
  // Persisted collapse via global UI store (same pattern as project/goal)
  const isCollapsed = useEntityUIStore(
    (s) => !!s.collapsed.milestone?.[milestone.id]
  );

  // Tasks directly under this milestone (milestone's descendants render their own tasks)
  const childTasks = useMemo(
    () =>
      (tasks ?? [])
        .filter((t) => t.modeId === mode.id && t.milestoneId === milestone.id)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [tasks, mode.id, milestone.id]
  );

  return (
    <div className="space-y-2" style={{ marginLeft: `${depth * 16}px` }}>
      <MilestoneCardDragDashboard
        milestone={milestone}
        dialogOpen={dialogOpen}
        variant={variant}
      />

      {!isCollapsed && (
        <div className="mt-2 space-y-4">
          <TaskSectionDashboard
            tasks={childTasks}
            mode={mode}
            modes={modes}
            onEditTask={onEditTask}
            milestoneId={milestone.id}
          />

          {milestone.children.map((child) => (
            <MilestoneTreeRendererDashboard
              key={child.id}
              milestone={child}
              depth={depth + 1}
              mode={mode}
              modes={modes}
              tasks={tasks}
              onEditMilestone={onEditMilestone}
              onEditTask={onEditTask}
              dialogOpen={dialogOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
}
