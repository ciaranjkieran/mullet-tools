import { ActiveTimerDTO, TimeEntryDTO } from "@shared/types/Timer";

export function getTitleAndColorFromPath(
  item: ActiveTimerDTO | TimeEntryDTO | null,
  ctx: any
) {
  if (!item || !item.path) return { title: "", color: "#E5E7EB" };
  return { title: "Placeholder", color: "#9CA3AF" };
}

export function pathToIdPayload(path: any) {
  if (!path) return {};
  if (path.taskId) return { taskId: path.taskId };
  if (path.milestoneId) return { milestoneId: path.milestoneId };
  if (path.projectId) return { projectId: path.projectId };
  if (path.goalId) return { goalId: path.goalId };
  return { modeId: path.modeId };
}
