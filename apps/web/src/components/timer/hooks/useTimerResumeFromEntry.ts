// src/components/timer/TimerView/hooks/useTimerResumeFromEntry.ts
/**
 * useTimerResumeFromEntry
 *
 * Handles resuming from a historical time entry, deciding whether
 * to start a countdown or a stopwatch based on planned/remaining time.
 */

import { useMemo } from "react";

import type { Task } from "@shared/types/Task";
import { buildStartPayloadFromSelection } from "../utils/startTimerPayload";
import {
  normalizePathIdsToSelection,
  resolvePlannedSecondsForEntry,
  type SelectionLike,
} from "../types/timerTypes";
import { pathToIdPayload } from "../utils/timerPath";

type Args = {
  tasks: Task[];
  modeId: number;
  startMut: { mutate: (payload: any) => void };
  setBaselineSel: (sel: SelectionLike) => void;
};

export function useTimerResumeFromEntry({
  tasks,
  modeId,
  startMut,
  setBaselineSel,
}: Args) {
  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  function handleResumeFromEntry(
    entry: any,
    opts?: { remainingSeconds?: number }
  ) {
    const raw = pathToIdPayload(entry.path);
    const normalized = normalizePathIdsToSelection(raw, modeId);

    let remaining =
      typeof opts?.remainingSeconds === "number" ? opts.remainingSeconds : null;
    if (remaining == null) {
      const planned = resolvePlannedSecondsForEntry(entry, taskById);
      if (typeof planned === "number") {
        const elapsed = entry.seconds ?? 0;
        remaining = Math.max(0, planned - elapsed);
      }
    }

    if (typeof remaining === "number") {
      startMut.mutate(
        buildStartPayloadFromSelection(normalized, "timer", remaining)
      );
    } else {
      startMut.mutate(
        buildStartPayloadFromSelection(normalized, "stopwatch", 0)
      );
      setBaselineSel(normalized);
    }
  }

  function resolvePlannedSeconds(entry: any): number | null {
    return resolvePlannedSecondsForEntry(entry, taskById);
  }

  return { handleResumeFromEntry, resolvePlannedSeconds };
}
