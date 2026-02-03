import SplitTaskListDashboard from "./SplitTaskListDashboard";
import AddTaskInline from "../../windows/AddTaskInline";
import { Task } from "@shared/types/Task";
import { Mode } from "@shared/types/Mode";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";

type Props = {
  modes: Mode[];
  tasks: Task[];
  mode: Mode;
  onEditTask?: (task: Task) => void;
  goalId?: number;
  projectId?: number;
  milestoneId?: number;
};

export default function TaskSectionDashboard({
  tasks,
  onEditTask,
  goalId,
  projectId,
  milestoneId,
  modes,
  mode,
}: Props) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  return (
    <div className="mt-2 space-y-2">
      {tasks.length > 0 && (
        <SplitTaskListDashboard modes={modes} mode={mode} tasks={tasks} />
      )}
      {isDesktop && (
        <AddTaskInline
          inlineMode={mode}
          modes={modes}
          goalId={goalId}
          projectId={projectId}
          milestoneId={milestoneId}
        />
      )}
    </div>
  );
}
