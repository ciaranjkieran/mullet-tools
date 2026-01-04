// @shared/lineage/pathToSelection.ts
import { TimerPath } from "../../../apps/web/src/lib/utils/userTimerIntentStore";
// If you prefer not to import that file, just inline the type here.

export function pathToSelection(path: TimerPath, fallbackModeId = -1) {
  return {
    modeId: typeof path.modeId === "number" ? path.modeId : fallbackModeId,
    goalId: path.goalId ?? null,
    projectId: path.projectId ?? null,
    milestoneId: path.milestoneId ?? null,
    taskId: path.taskId ?? null,
  };
}
