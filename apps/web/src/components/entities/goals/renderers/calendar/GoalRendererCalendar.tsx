"use client";

import { Goal } from "@shared/types/Goal";
import { Mode } from "@shared/types/Mode";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useDialogStore } from "@/lib/dialogs/useDialogStore";
import {
  parseISO,
  isBefore,
  differenceInCalendarDays,
  startOfToday,
} from "date-fns";
import { useDeleteGoal } from "@shared/api/hooks/goals/useDeleteGoal";
import { TargetIcon } from "lucide-react";

import { useSelectionStore } from "@/lib/store/useSelectionStore";
import EntityDragHandle from "@/components/common/EntityDragHandle";

// shared drag types
import type {
  DragAttributes,
  DragListeners,
} from "../../../../dnd/calendar/dragTypes";

type Props = {
  goal: Goal;
  mode: Mode | undefined;
  onEdit?: (goal: Goal) => void;
  showModeTitle?: boolean;
  // injected by CalendarEntityDragCard
  dragAttributes?: DragAttributes;
  dragListeners?: DragListeners;
  activatorRef?: (el: HTMLElement | null) => void; // ⬅️ match milestones/tasks
};

export default function GoalRendererCalendar({
  goal,
  mode,
  onEdit,
  showModeTitle = false,
  dragAttributes,
  dragListeners,
  activatorRef,
}: Props) {
  const modeColor = mode?.color || "#000";
  const { mutate: deleteGoal } = useDeleteGoal();
  const { setGoalToEdit, setIsGoalDialogOpen } = useDialogStore();
  const today = startOfToday();

  const isSelected = useSelectionStore((s) => s.isSelected("goal", goal.id));

  let computedOverdueLabel: string | null = null;
  if (goal.dueDate && isBefore(parseISO(goal.dueDate), today)) {
    const daysLate = differenceInCalendarDays(today, parseISO(goal.dueDate));
    computedOverdueLabel = `${daysLate} day${daysLate > 1 ? "s" : ""} ago`;
  }

  const handleEdit = () => {
    onEdit?.(goal);
    setGoalToEdit(goal);
    setIsGoalDialogOpen(true);
  };

  const handleCompletion = () => {
    deleteGoal(goal.id);
  };

  return (
    <div
      data-entity-card="true"
      data-entity-type="goal"
      data-entity-id={goal.id}
      className={clsx(
        "px-4 py-3 bg-white group transition hover:bg-gray-50 relative",
        isSelected
          ? "ring-2 z-10"
          : "border-t border-transparent first:border-t-0"
      )}
      style={
        isSelected
          ? { boxShadow: `0 0 0 2px ${modeColor}`, backgroundColor: "#f0f8ff" }
          : undefined
      }
    >
      <div className="flex justify-between items-start">
        {/* Left: icon + text */}
        <div className="flex items-start gap-2">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
            style={{ backgroundColor: modeColor }}
          >
            <TargetIcon className="w-4 h-4 text-white" />
          </div>

          <div className="flex flex-col">
            <div
              className="group/edit flex items-center gap-2 cursor-pointer"
              onClick={handleEdit}
            >
              <span className="text-md font-semibold">{goal.title}</span>
              <PencilSquareIcon className="h-4 w-4 text-gray-400 opacity-0 group-hover/edit:opacity-100 transition-opacity" />
            </div>
            {goal.dueTime && (
              <p className="text-xs text-black-500">
                Due: {`at ${goal.dueTime.slice(0, 5)}`}
              </p>
            )}

            {showModeTitle && mode?.title && (
              <p
                className="text-xs font-medium mt-1"
                style={{ color: modeColor }}
              >
                {mode.title}
              </p>
            )}

            {computedOverdueLabel && (
              <p className="text-xs text-red-900 font-medium">
                {computedOverdueLabel}
              </p>
            )}
          </div>
        </div>

        {/* Right: drag handle + checkbox */}
        <div className="flex items-center gap-2">
          <EntityDragHandle
            entityKind="goal"
            entityId={goal.id}
            className="p-1 rounded"
            // Today (sortable): listeners + activatorRef
            // Not Today (draggable): attributes + listeners
            {...dragAttributes}
            {...dragListeners}
            activatorRef={activatorRef}
          />

          <input
            type="checkbox"
            onClick={(e) => {
              e.stopPropagation();
              handleCompletion();
            }}
            onChange={() => {}}
            className="w-4 h-4 rounded-full border border-gray-400 checked:bg-black checked:border-black cursor-pointer"
            aria-label={`Mark "${goal.title}" as complete`}
            style={{ accentColor: modeColor }}
          />
        </div>
      </div>
    </div>
  );
}
