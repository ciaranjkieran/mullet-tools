// @shared/api/batch/useBatchApply.ts
"use client";

import { useState } from "react";
import { ParentType } from "../types/types";
import { useBatchGroupUnder } from "./useBatchGroupUnder"; // adjust path if needed
import { useBatchSchedule } from "./useBatchSchedule";
import { useBatchComplete } from "./useBatchComplete";
import { useBatchDelete } from "./useBatchDelete";
import { useBatchChangeMode } from "./useBatchChangeMode"; // adjust path

type SelectedSets = {
  task: Set<number>;
  milestone: Set<number>;
  project: Set<number>;
  goal: Set<number>;
};

type SelectedIds = {
  task: number[];
  milestone: number[];
  project: number[];
  goal: number[];
};

function setsToIds(sel: SelectedSets): SelectedIds {
  return {
    task: Array.from(sel.task ?? []),
    milestone: Array.from(sel.milestone ?? []),
    project: Array.from(sel.project ?? []),
    goal: Array.from(sel.goal ?? []),
  };
}

export function useBatchApply() {
  const [isApplying, setIsApplying] = useState(false);

  const groupUnder = useBatchGroupUnder();
  const schedule = useBatchSchedule();
  const complete = useBatchComplete();
  const remove = useBatchDelete();
  const changeMode = useBatchChangeMode();

  async function apply(params: {
    selected: SelectedSets;
    targetModeId: number | null;
    targetParent: { id: number; type: ParentType; title?: string } | null;
    setToday: boolean;
    dueDate: string; // yyyy-mm-dd
    dueTime: string; // HH:mm
    clearDueDate?: boolean; // ✅ add
    markComplete: boolean;
    doDelete: boolean;
  }) {
    const nothingToDo =
      !params.targetParent &&
      !params.targetModeId &&
      !(
        params.setToday ||
        params.dueDate ||
        params.dueTime ||
        params.clearDueDate
      ) && // ✅
      !params.markComplete &&
      !params.doDelete;

    if (nothingToDo) return;

    const selected = setsToIds(params.selected);
    const shouldClear = Boolean(params.clearDueDate);

    const nextDateISO = shouldClear
      ? null
      : params.setToday
      ? new Date().toISOString().slice(0, 10)
      : params.dueDate || null;

    const nextTime = shouldClear ? null : params.dueTime || null;

    setIsApplying(true);
    try {
      const steps: Array<() => Promise<any>> = [];

      // STEP 1 (reserved): change mode — added in Step 2
      // STEP 1: change mode first (if requested)
      if (params.targetModeId) {
        const modeId = params.targetModeId;
        steps.push(() => changeMode.mutateAsync({ selected, modeId }));
      }

      // STEP 2: group under (if chosen)
      const parent = params.targetParent;
      if (parent) {
        const { id: parentId, type: parentType } = parent; // snapshot to primitives
        steps.push(() =>
          groupUnder.mutateAsync({
            selected,
            parentType,
            parentId,
          })
        );
      }

      // STEP 3: schedule (if date or time set)
      // STEP 3: schedule (if date/time set OR explicitly clearing)
      if (shouldClear || nextDateISO || nextTime) {
        steps.push(() =>
          schedule.mutateAsync({
            selected,
            dueDate: nextDateISO,
            dueTime: nextTime,
          })
        );
      }

      // STEP 4: complete
      if (params.markComplete) {
        steps.push(() => complete.mutateAsync({ selected }));
      }

      // STEP 5: delete
      if (params.doDelete) {
        steps.push(() => remove.mutateAsync({ selected }));
      }

      for (const step of steps) {
        await step();
      }
    } finally {
      setIsApplying(false);
    }
  }

  return { apply, isApplying };
}
