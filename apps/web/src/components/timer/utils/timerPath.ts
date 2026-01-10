import { ActiveTimerDTO, TimeEntryDTO } from "@shared/types/Timer";

type TimerPath = {
  taskId?: number | null;
  milestoneId?: number | null;
  projectId?: number | null;
  goalId?: number | null;
  modeId?: number | null;
};

export function getTitleAndColorFromPath(
  item: ActiveTimerDTO | TimeEntryDTO | null
) {
  if (!item || !item.path) {
    return { title: "", color: "#E5E7EB" };
  }

  return { title: "Placeholder", color: "#9CA3AF" };
}

export function pathToIdPayload(path: TimerPath | null) {
  if (!path) return {};

  if (path.taskId != null) return { taskId: path.taskId };
  if (path.milestoneId != null) return { milestoneId: path.milestoneId };
  if (path.projectId != null) return { projectId: path.projectId };
  if (path.goalId != null) return { goalId: path.goalId };
  if (path.modeId != null) return { modeId: path.modeId };

  return {};
}
