// @shared/lineage/pathToSelection.ts
import type { TimerPath } from "./toTimerPath";

export function pathToSelection(path: TimerPath, fallbackModeId = -1) {
  return {
    modeId: typeof path.modeId === "number" ? path.modeId : fallbackModeId,
    goalId: path.goalId ?? null,
    projectId: path.projectId ?? null,
    milestoneId: path.milestoneId ?? null,
    taskId: path.taskId ?? null,
  };
}
