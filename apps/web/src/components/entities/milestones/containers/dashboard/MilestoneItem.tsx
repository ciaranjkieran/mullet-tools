// components/entities/milestones/containers/dashboard/MilestoneItem.tsx
"use client";

import { Mode } from "@shared/types/Mode";
import { Task } from "@shared/types/Task";
import { NestedMilestone } from "../../utils/MilestoneTreeBuilder";
import MilestoneRenderer from "../../renderers/dashboard/MilestoneRendererDashboard";
import { useEntityUIStore } from "@/lib/store/useEntityUIStore";
import MilestoneList from "./MilestoneList";
import TaskSectionDashboard from "@/components/entities/tasks/containers/dashboard/TaskSectionDashboard";

type Props = {
  milestone: NestedMilestone;
  parentId: number | null;
  depth: number;
  mode: Mode;
  modes: Mode[];
  tasks: Task[];
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
};

export default function MilestoneItem({
  milestone,
  parentId,
  depth,
  mode,
  modes,
  tasks,
  dragHandleProps,
}: Props) {
  // ---- SAFETY: ensure we have an id before anything else
  const milestoneId = (milestone as any)?.id as number | undefined;
  if (!milestoneId) {
    console.warn("MilestoneItem: missing milestone.id", milestone);
    return null;
  }

  const collapsed = !!useEntityUIStore(
    (s) => s.collapsed.milestone?.[milestoneId]
  );
  const modeColor =
    modes.find((m) => m.id === milestone.modeId)?.color ?? "#000";

  // Children are already effective-tree’d by the list/builder.
  const children = (milestone as any)?.children ?? [];

  // Tasks under THIS milestone
  const childTasks = tasks
    .filter((t) => t.modeId === mode.id && t.milestoneId === milestoneId)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  return (
    <div className="space-y-2" style={{ paddingLeft: depth * 16 }}>
      <MilestoneRenderer
        milestone={milestone}
        mode={mode}
        dragHandleProps={dragHandleProps}
        modeColor={modeColor}
      />

      {!collapsed && (
        <div className="mt-2 space-y-4">
          {/* Tasks that belong to THIS milestone */}
          <TaskSectionDashboard
            tasks={childTasks}
            mode={mode}
            modes={modes}
            milestoneId={milestoneId}
          />

          {/* Sub-milestones (children) — recursion */}
          {children.length > 0 && (
            <MilestoneList
              parentId={milestoneId}
              milestones={children}
              depth={depth + 1}
              mode={mode}
              modes={modes}
              tasks={tasks}
            />
          )}
        </div>
      )}
    </div>
  );
}
