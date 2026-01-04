"use client";

import { Mode } from "@shared/types/Mode";
import { Task } from "@shared/types/Task";
import TaskRendererDashboard from "../../renderers/dashboard/TaskRendererDashboard";

type Props = {
  mode: Mode;
  modes: Mode[];
  tasks: Task[];
  onEditTask?: (task: Task) => void;
  showComposer?: boolean;
};

export default function TaskListScheduledDashboard({
  mode,
  tasks,
  onEditTask,
  showComposer = false,
}: Props) {
  if (!tasks.length && !showComposer) return null;

  // ✅ sort tasks by dueDate, then dueTime if present
  const sortedTasks = [...tasks].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;

    const dateCompare = a.dueDate.localeCompare(b.dueDate);
    if (dateCompare !== 0) return dateCompare;

    // both have same date → compare times if they exist
    if (a.dueTime && b.dueTime) {
      return a.dueTime.localeCompare(b.dueTime);
    }
    if (a.dueTime) return -1; // a has time, b doesn’t
    if (b.dueTime) return 1; // b has time, a doesn’t

    return 0;
  });

  return (
    <div className="mt-4">
      <div className="grid grid-cols-1 gap-4">
        {sortedTasks.map((task) => (
          <TaskRendererDashboard key={task.id} task={task} mode={mode} />
        ))}
      </div>
    </div>
  );
}
