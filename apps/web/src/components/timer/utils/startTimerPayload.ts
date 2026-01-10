type ClockType = "stopwatch" | "timer";

type StartPayloadBase =
  | { kind: "stopwatch" }
  | { kind: "timer"; durationSec: number };

type StartPayload =
  | (StartPayloadBase & { taskId: number })
  | (StartPayloadBase & { milestoneId: number })
  | (StartPayloadBase & { projectId: number })
  | (StartPayloadBase & { goalId: number })
  | (StartPayloadBase & { modeId: number });

export function buildStartPayloadFromSelection(
  sel: {
    modeId: number;
    goalId: number | null;
    projectId: number | null;
    milestoneId: number | null;
    taskId: number | null;
  },
  clockType: ClockType,
  durationSec: number
): StartPayload {
  const base: StartPayloadBase =
    clockType === "timer"
      ? { kind: "timer", durationSec }
      : { kind: "stopwatch" };

  if (sel.taskId != null) return { ...base, taskId: sel.taskId };
  if (sel.milestoneId != null) return { ...base, milestoneId: sel.milestoneId };
  if (sel.projectId != null) return { ...base, projectId: sel.projectId };
  if (sel.goalId != null) return { ...base, goalId: sel.goalId };
  return { ...base, modeId: sel.modeId };
}
