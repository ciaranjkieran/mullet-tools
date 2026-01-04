"use client";

import { Task } from "@shared/types/Task";
import { Mode } from "@shared/types/Mode";
import TaskListScheduledDashboard from "./TaskListScheduledDashboard";
import TaskListUnscheduledDashboard from "./TaskListUnscheduledDashboard";
import AddTaskInline from "../../windows/AddTaskInline";

type Props = {
  mode: Mode;
  modes: Mode[];
  tasks: Task[];
  onEditTask?: (task: Task) => void;
  goalId?: number;
  projectId?: number;
  milestoneId?: number;
};

export default function SplitTaskListDashboard({
  mode,
  tasks,
  onEditTask,
  modes,
  goalId,
  projectId,
  milestoneId,
}: Props) {
  const scheduled = tasks.filter((t) => !!t.dueDate);
  const unscheduled = tasks.filter((t) => !t.dueDate);

  if (tasks.length === 0) return null;

  return (
    <div className="mt-2 space-y-2">
      {scheduled.length > 0 && (
        <TaskListScheduledDashboard
          tasks={scheduled}
          mode={mode}
          modes={modes}
          onEditTask={onEditTask}
          showComposer={false}
        />
      )}

      {unscheduled.length > 0 && (
        <TaskListUnscheduledDashboard
          tasks={unscheduled}
          modes={modes}
          mode={mode}
          onEditTask={onEditTask}
        />
      )}
    </div>
  );
}
