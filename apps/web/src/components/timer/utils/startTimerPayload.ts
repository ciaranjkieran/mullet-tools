export function buildStartPayloadFromSelection(
  sel: {
    modeId: number;
    goalId: number | null;
    projectId: number | null;
    milestoneId: number | null;
    taskId: number | null;
  },
  clockType: "stopwatch" | "timer",
  durationSec: number
) {
  const base: any = { kind: clockType };
  if (clockType === "timer") base.durationSec = durationSec;
  if (sel.taskId) return { ...base, taskId: sel.taskId };
  if (sel.milestoneId) return { ...base, milestoneId: sel.milestoneId };
  if (sel.projectId) return { ...base, projectId: sel.projectId };
  if (sel.goalId) return { ...base, goalId: sel.goalId };
  return { ...base, modeId: sel.modeId };
}
