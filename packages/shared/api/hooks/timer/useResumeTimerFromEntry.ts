import { TimeEntryDTO } from "../../../types/Timer";
import { useStartTimer } from "./useStartTimer";

/**
 * Resume a timer from a previous entry, optionally as a countdown starting
 * from `remainingSeconds`. Backend should interpret:
 * - remainingSeconds: start countdown from this value (instead of 0).
 * - resumeFromEntryId: link continuity (analytics / stitching).
 * - path: reuse the entity path from the previous entry.
 */
export function useResumeTimerFromEntry() {
  const startMut = useStartTimer();

  return (entry: TimeEntryDTO, opts?: { remainingSeconds?: number }) => {
    const payload: any = {
      path: entry.path, // { modeId, taskId, ... }
      resumeFromEntryId: entry.id,
    };

    if (typeof opts?.remainingSeconds === "number") {
      payload.remainingSeconds = opts.remainingSeconds;
    }

    // If your backend expects targetSeconds + alreadyLogged instead:
    // const plannedSeconds = (entry as any).plannedSeconds;
    // if (typeof plannedSeconds === "number") {
    //   payload.targetSeconds = plannedSeconds;
    //   payload.alreadyLogged = entry.seconds ?? 0;
    // }

    startMut.mutate(payload);
  };
}
