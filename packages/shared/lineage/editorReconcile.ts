// shared/lineage/editorReconcile.ts
"use client";

import { useCallback } from "react";
import type { EditorSelection, EditorDatasets } from "./editorFilter";
import { reconcileAfterChange } from "./editorFilter";

/**
 * Framework-agnostic factory.
 * You give it a current selection getter and an "apply" function to set fields,
 * and it returns the onChange handlers with proper descendant clearing.
 */
export function makeEditorReconcileHandlers(
  getSel: () => EditorSelection,
  apply: (next: Partial<EditorSelection>) => void,
  datasets: EditorDatasets
) {
  const onGoalChange = (goalId: number | null) => {
    const sel = getSel();
    const rec = reconcileAfterChange(sel, { goalId }, datasets);
    apply({
      goalId: rec.goalId,
      projectId: rec.projectId,
      milestoneId: rec.milestoneId,
    });
  };

  // after
  const onProjectChange = (projectId: number | null) => {
    const sel = getSel();
    const rec = reconcileAfterChange(sel, { projectId }, datasets);
    apply({
      goalId: rec.goalId,
      projectId: rec.projectId,
      milestoneId: rec.milestoneId,
    });
  };

  const onMilestoneChange = (milestoneId: number | null) => {
    const sel = getSel();
    const rec = reconcileAfterChange(sel, { milestoneId }, datasets);
    apply({
      goalId: rec.goalId,
      projectId: rec.projectId,
      milestoneId: rec.milestoneId,
    });
  };
  return { onGoalChange, onProjectChange, onMilestoneChange };
}

/**
 * React Hook Form adapter.
 * Usage in a window:
 *   const { onGoalChange, onProjectChange, onMilestoneChange } =
 *     useRHFEditorReconcileHandlers({ watch, setValue }, datasets);
 */
export function useRHFEditorReconcileHandlers(
  form: {
    watch: <T = any>(name?: string | string[]) => T;
    setValue: (
      name: keyof EditorSelection,
      value: any,
      opts?: { shouldDirty?: boolean }
    ) => void;
  },
  datasets: EditorDatasets
) {
  const getSel = useCallback<() => EditorSelection>(() => {
    const modeId = form.watch("modeId") as number;
    const goalId = form.watch("goalId") as number | null;
    const projectId = form.watch("projectId") as number | null;
    const milestoneId = form.watch("milestoneId") as number | null;
    return { modeId, goalId, projectId, milestoneId };
  }, [form]);

  const apply = useCallback(
    (next: Partial<EditorSelection>) => {
      if ("goalId" in next)
        form.setValue("goalId", next.goalId as any, { shouldDirty: true });
      if ("projectId" in next)
        form.setValue("projectId", next.projectId as any, {
          shouldDirty: true,
        });
      if ("milestoneId" in next)
        form.setValue("milestoneId", next.milestoneId as any, {
          shouldDirty: true,
        });
    },
    [form]
  );

  const base = makeEditorReconcileHandlers(getSel, apply, datasets);

  // Avoid re-creating handlers unless deps change
  const onGoalChange = useCallback(base.onGoalChange, [base]);
  const onProjectChange = useCallback(base.onProjectChange, [base]);
  const onMilestoneChange = useCallback(base.onMilestoneChange, [base]);

  return { onGoalChange, onProjectChange, onMilestoneChange };
}

/**
 * Batch helper: apply a field change to many entities with reconciliation per item.
 * You provide the current list and get back a new list with safe clears applied.
 */
export function reconcileBatchApply<
  T extends EditorSelection & Record<string, any>
>(
  items: T[],
  field: keyof Pick<EditorSelection, "goalId" | "projectId" | "milestoneId">,
  value: number | null,
  datasets: EditorDatasets
): T[] {
  return items.map((e) => {
    const rec = reconcileAfterChange(
      {
        modeId: e.modeId,
        goalId: e.goalId,
        projectId: e.projectId,
        milestoneId: e.milestoneId,
      },
      { [field]: value } as Partial<EditorSelection>,
      datasets
    );
    return { ...e, ...rec };
  });
}
