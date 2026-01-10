"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelectionStore } from "@/lib/store/useSelectionStore";
import { useBatchEditorStore } from "@/lib/store/useBatchEditorStore";
import { useModeStore } from "@shared/store/useModeStore";
import { useTaskStore } from "@shared/store/useTaskStore";
import { useMilestoneStore } from "@shared/store/useMilestoneStore";
import { useProjectStore } from "@shared/store/useProjectStore";
import { useGoalStore } from "@shared/store/useGoalStore";
import { getContrastingText } from "@shared/utils/getContrastingText";

type Props = {
  /** Optional controlled visibility */
  open?: boolean;
  /** Controlled setter */
  onOpenChange?: (open: boolean) => void;
  /** Optional: offset the bubble without editing CSS */
  offsetLeftPx?: number; // default 375
};

type EntityWithMode = {
  id: number;
  modeId?: number;
  mode?: number | { id: number };
};

type Mode = { id: number; color?: string };

// Store shapes can vary (map vs array), so we keep selectors flexible but typed safely.
type StoreWithById<T extends { id: number }> = {
  byId?: Record<number, T>;
  tasksById?: Record<number, T>;
  milestonesById?: Record<number, T>;
  projectsById?: Record<number, T>;
  goalsById?: Record<number, T>;
};

type StoreWithArray<T> = {
  tasks?: T[];
  milestones?: T[];
  projects?: T[];
  goals?: T[];
};

export default function BatchEditorTrigger({
  open: controlledOpen,
  onOpenChange,
  offsetLeftPx = 375,
}: Props) {
  const totalCount = useSelectionStore((s) => s.totalCount());
  const selected = useSelectionStore((s) => s.selected);
  const clearAll = useSelectionStore((s) => s.clearAll);
  const setIsBatchEditorOpen = useBatchEditorStore(
    (s) => s.setIsBatchEditorOpen
  );

  const modes = useModeStore((s) => s.modes as Mode[] | undefined);

  // ---- Tasks ----
  const tasksById = useTaskStore((s) => {
    const st = s as unknown as StoreWithById<EntityWithMode>;
    return st.byId ?? st.tasksById ?? null;
  });
  const tasksArr = useTaskStore((s) => {
    const st = s as unknown as StoreWithArray<EntityWithMode>;
    return st.tasks ?? [];
  });
  const getTask = useCallback(
    (id: number) =>
      tasksById
        ? (tasksById as Record<number, EntityWithMode>)[id]
        : tasksArr.find((t) => t.id === id),
    [tasksById, tasksArr]
  );

  // ---- Milestones ----
  const milestonesById = useMilestoneStore((s) => {
    const st = s as unknown as StoreWithById<EntityWithMode>;
    return st.byId ?? st.milestonesById ?? null;
  });
  const milestonesArr = useMilestoneStore((s) => {
    const st = s as unknown as StoreWithArray<EntityWithMode>;
    return st.milestones ?? [];
  });
  const getMilestone = useCallback(
    (id: number) =>
      milestonesById
        ? (milestonesById as Record<number, EntityWithMode>)[id]
        : milestonesArr.find((m) => m.id === id),
    [milestonesById, milestonesArr]
  );

  // ---- Projects ----
  const projectsById = useProjectStore((s) => {
    const st = s as unknown as StoreWithById<EntityWithMode>;
    return st.byId ?? st.projectsById ?? null;
  });
  const projectsArr = useProjectStore((s) => {
    const st = s as unknown as StoreWithArray<EntityWithMode>;
    return st.projects ?? [];
  });
  const getProject = useCallback(
    (id: number) =>
      projectsById
        ? (projectsById as Record<number, EntityWithMode>)[id]
        : projectsArr.find((p) => p.id === id),
    [projectsById, projectsArr]
  );

  // ---- Goals ----
  const goalsById = useGoalStore((s) => {
    const st = s as unknown as StoreWithById<EntityWithMode>;
    return st.byId ?? st.goalsById ?? null;
  });
  const goalsArr = useGoalStore((s) => {
    const st = s as unknown as StoreWithArray<EntityWithMode>;
    return st.goals ?? [];
  });
  const getGoal = useCallback(
    (id: number) =>
      goalsById
        ? (goalsById as Record<number, EntityWithMode>)[id]
        : goalsArr.find((g) => g.id === id),
    [goalsById, goalsArr]
  );

  // Uncontrolled fallback
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? (controlledOpen as boolean) : uncontrolledOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (isControlled) onOpenChange?.(next);
      else setUncontrolledOpen(next);
    },
    [isControlled, onOpenChange]
  );

  // Snapshot the last non-zero count while open to avoid "0 selected" flicker if selection clears on mousedown.
  const lastCountWhileOpen = useRef<number>(0);
  useEffect(() => {
    if (open && totalCount > 0) lastCountWhileOpen.current = totalCount;
  }, [open, totalCount]);

  const displayCount = useMemo(
    () => (open ? totalCount || lastCountWhileOpen.current || 0 : totalCount),
    [open, totalCount]
  );

  // Auto-open when user selects multiple (uncontrolled only).
  useEffect(() => {
    if (!isControlled && totalCount > 1 && !uncontrolledOpen) {
      setUncontrolledOpen(true);
    }
  }, [isControlled, totalCount, uncontrolledOpen]);

  const handleCancel = () => {
    clearAll(); // remove this line if you only want to close without clearing
    setOpen(false);
  };

  const handleYes = () => {
    setIsBatchEditorOpen(true); // open your real batch editor UI
    setOpen(false);
  };

  // ---- YES button color logic ----
  const selectedModeIds = useMemo(() => {
    const ids = new Set<number>();

    const addMode = (entity?: EntityWithMode) => {
      const mid =
        entity?.modeId ??
        (typeof entity?.mode === "object" ? entity.mode?.id : entity?.mode);
      if (typeof mid === "number") ids.add(mid);
    };

    selected.task.forEach((id: number) => addMode(getTask(id)));
    selected.milestone.forEach((id: number) => addMode(getMilestone(id)));
    selected.project.forEach((id: number) => addMode(getProject(id)));
    selected.goal.forEach((id: number) => addMode(getGoal(id)));

    return ids;
  }, [selected, getTask, getMilestone, getProject, getGoal]);

  const yesBg = useMemo(() => {
    if (selectedModeIds.size === 1) {
      const onlyId = [...selectedModeIds][0];
      const mode = modes?.find((m) => m.id === onlyId);
      return mode?.color || "#000000";
    }
    return "#000000";
  }, [selectedModeIds, modes]);

  const yesFg = useMemo(() => getContrastingText(yesBg), [yesBg]);

  // Close bubble when selection clears (totalCount -> 0)
  useEffect(() => {
    if (open && totalCount === 0) setOpen(false);
  }, [open, totalCount, setOpen]);

  return (
    <div className="relative">
      <div
        role="dialog"
        aria-hidden={!open}
        aria-label="Batch edit confirmation"
        data-batch-ui="true"
        className={`absolute bottom-0 z-[999] w-[280px] rounded-md border border-gray-300 bg-white p-4 shadow-md transition-opacity duration-200 ${
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        style={{ left: -offsetLeftPx }}
      >
        <div className="mb-3 text-sm font-medium">
          Batch edit {displayCount} selected item{displayCount === 1 ? "" : "s"}
          ?
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleCancel}
            className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100"
          >
            Cancel
          </button>

          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleYes}
            className="cursor-pointer rounded px-3 py-1 text-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: yesBg, color: yesFg }}
            data-no-dnd="true"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}
