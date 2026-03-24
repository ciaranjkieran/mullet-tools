"use client";

import { useState } from "react";
import { Goal } from "@shared/types/Goal";
import { Mode } from "@shared/types/Mode";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useDialogStore } from "@/lib/dialogs/useDialogStore";
import CompletionCheckbox from "@/components/common/CompletionCheckbox";
import {
  parseISO,
  isBefore,
  differenceInCalendarDays,
  startOfToday,
} from "date-fns";
import { useDeleteGoal } from "@shared/api/hooks/goals/useDeleteGoal";
import { LocateFixed } from "lucide-react";
import Icon from "../../UI/GoalIcon";
import GoalTarget from "../../UI/GoalTarget";

import { useSelectionStore } from "@/lib/store/useSelectionStore";
import { useShiftClickSelect } from "@/lib/hooks/useShiftClickSelect";
import EntityDragHandle from "@/components/common/EntityDragHandle";
import AssigneeAvatar from "@/components/common/AssigneeAvatar";

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
  const [showCheckbox, setShowCheckbox] = useState(false);

  const isSelected = useSelectionStore((s) => s.isSelected("goal", goal.id));
  const { onClickCapture, onMouseDownCapture } = useShiftClickSelect("goal", goal.id);

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

  return (
    <div
      data-entity-card="true"
      data-entity-type="goal"
      data-entity-id={goal.id}
      onClickCapture={onClickCapture}
      onMouseDownCapture={onMouseDownCapture}
      className={clsx(
        "px-2 sm:px-4 py-2 sm:py-3 bg-white group transition hover:bg-gray-50 relative",
        isSelected
          ? "ring-2 z-10"
          : "border-t border-transparent first:border-t-0",
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
          <button
            type="button"
            onClick={() => setShowCheckbox((v) => !v)}
            className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 mt-0.5 flex items-center justify-center cursor-pointer"
            aria-label="Toggle between focus and complete"
          >
            {showCheckbox ? (
              <div
                className="w-5 h-5 flex items-center justify-center border-2 rounded-full"
                style={{ borderColor: modeColor }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: modeColor }}
                />
              </div>
            ) : (
              <div
                className="w-5 h-5 flex items-center justify-center rounded-full"
                style={{ backgroundColor: modeColor }}
              >
                <Icon size={16} className="text-white">
                  <GoalTarget />
                </Icon>
              </div>
            )}
          </button>

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

        {/* Right: avatar + drag handle + checkbox */}
        <div className="flex items-center gap-2">
          <AssigneeAvatar assignee={goal.assignee} size={18} />
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

          {showCheckbox ? (
            <CompletionCheckbox
              modeColor={modeColor}
              label={`Mark "${goal.title}" as complete`}
              onComplete={() => deleteGoal(goal.id)}
              shape="square"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                const { openFocusModal } = useDialogStore.getState();
                openFocusModal("goal", goal, modeColor, mode?.id ?? 0);
              }}
              className="p-1 rounded hover:bg-gray-100 transition cursor-pointer"
              aria-label={`Focus on "${goal.title}"`}
            >
              <LocateFixed size={20} strokeWidth={2} style={{ color: modeColor }} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
