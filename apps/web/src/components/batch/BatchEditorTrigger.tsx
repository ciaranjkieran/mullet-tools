"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

  // entity stores (robust selectors that work with either maps or arrays)
  const modes = useModeStore((s) => s.modes);

  const tasksById = useTaskStore((s: any) => s.byId ?? s.tasksById ?? null);
  const tasksArr = useTaskStore((s: any) => s.tasks ?? []);
  const getTask = (id: number) =>
    tasksById ? tasksById[id] : tasksArr.find((t: any) => t.id === id);

  const milestonesById = useMilestoneStore(
    (s: any) => s.byId ?? s.milestonesById ?? null
  );
  const milestonesArr = useMilestoneStore((s: any) => s.milestones ?? []);
  const getMilestone = (id: number) =>
    milestonesById
      ? milestonesById[id]
      : milestonesArr.find((m: any) => m.id === id);

  const projectsById = useProjectStore(
    (s: any) => s.byId ?? s.projectsById ?? null
  );
  const projectsArr = useProjectStore((s: any) => s.projects ?? []);
  const getProject = (id: number) =>
    projectsById ? projectsById[id] : projectsArr.find((p: any) => p.id === id);

  const goalsById = useGoalStore((s: any) => s.byId ?? s.goalsById ?? null);
  const goalsArr = useGoalStore((s: any) => s.goals ?? []);
  const getGoal = (id: number) =>
    goalsById ? goalsById[id] : goalsArr.find((g: any) => g.id === id);

  // Uncontrolled fallback
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? (controlledOpen as boolean) : uncontrolledOpen;

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

  const setOpen = (next: boolean) => {
    if (isControlled) onOpenChange?.(next);
    else setUncontrolledOpen(next);
  };

  const handleCancel = () => {
    clearAll(); // remove this line if you only want to close without clearing
    setOpen(false);
  };

  const handleYes = () => {
    setIsBatchEditorOpen(true); // open your real batch editor UI
    setOpen(false);
  };

  // ---- YES button color logic ----
  // Gather distinct modeIds across selected entities
  const selectedModeIds = useMemo(() => {
    const ids = new Set<number>();

    // helper to safely add a modeId that may be at entity.mode or entity.modeId
    const addMode = (entity: any) => {
      const mid = entity?.modeId ?? entity?.mode?.id ?? entity?.mode;
      if (typeof mid === "number") ids.add(mid);
    };

    selected.task.forEach((id) => addMode(getTask(id)));
    selected.milestone.forEach((id) => addMode(getMilestone(id)));
    selected.project.forEach((id) => addMode(getProject(id)));
    selected.goal.forEach((id) => addMode(getGoal(id)));

    return ids;
  }, [
    selected,
    tasksById,
    tasksArr,
    milestonesById,
    milestonesArr,
    projectsById,
    projectsArr,
    goalsById,
    goalsArr,
  ]);

  const yesBg = useMemo(() => {
    if (selectedModeIds.size === 1) {
      const onlyId = [...selectedModeIds][0];
      const mode = modes?.find((m: any) => m.id === onlyId);
      return mode?.color || "#000000";
    }
    // multiple modes (or none): black
    return "#000000";
  }, [selectedModeIds, modes]);

  const yesFg = useMemo(() => getContrastingText(yesBg), [yesBg]);

  // --- Close bubble when the global hook clears selection (totalCount -> 0)
  useEffect(() => {
    if (open && totalCount === 0) {
      setOpen(false);
    }
  }, [open, totalCount]); // setOpen comes from closure

  return (
    <div className="relative">
      <div
        role="dialog"
        aria-hidden={!open}
        aria-label="Batch edit confirmation"
        data-batch-ui="true" // <-- so useGlobalOutsideDeselect treats clicks inside as safe
        // Keep mounted; just toggle interactivity/visibility
        className={`absolute bottom-0 z-[999] bg-white border border-gray-300 shadow-md p-4 rounded-md w-[280px] transition-opacity duration-200 ${
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        style={{ left: -offsetLeftPx }} // runtime offset
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
            className="text-sm px-3 py-1 rounded border border-gray-300 hover:bg-gray-100"
          >
            Cancel
          </button>

          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleYes}
            className="text-sm px-3 py-1 rounded cursor-pointer transition-opacity hover:opacity-90"
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
