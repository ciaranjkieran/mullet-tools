"use client";

import { Milestone } from "@shared/types/Milestone";
import { Mode } from "@shared/types/Mode";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";

import { useDeleteMilestone } from "@shared/api/hooks/milestones/useDeleteMilestone";
import { useDialogStore } from "../../../../../lib/dialogs/useDialogStore";
import {
  parseISO,
  isBefore,
  differenceInCalendarDays,
  startOfToday,
} from "date-fns";

// selection + reusable handle
import { useSelectionStore } from "../../../../../lib/store/useSelectionStore";
import EntityDragHandle from "../../../../common/EntityDragHandle";
import AssigneeAvatar from "../../../../common/AssigneeAvatar";

// shared drag types
import type {
  DragAttributes,
  DragListeners,
} from "../../../../dnd/calendar/dragTypes";

type Props = {
  milestone: Milestone;
  mode: Mode | undefined;
  onEdit?: (milestone: Milestone) => void;
  showModeTitle?: boolean;
  breadcrumb?: string;

  // injected by CalendarEntityDragCard
  dragAttributes?: DragAttributes;
  dragListeners?: DragListeners;
  activatorRef?: (el: HTMLElement | null) => void; // ⬅️ add this to mirror tasks
};

export default function MilestoneRendererCalendar({
  milestone,
  mode,
  onEdit,
  showModeTitle = false,
  breadcrumb,
  dragAttributes,
  dragListeners,
  activatorRef, // ⬅️ receive it
}: Props) {
  const modeColor = mode?.color || "#000";
  const { mutate: deleteMilestone } = useDeleteMilestone();
  const { setMilestoneToEdit, setIsMilestoneDialogOpen } = useDialogStore();
  const today = startOfToday();

  const isSelected = useSelectionStore((s) =>
    s.isSelected("milestone", milestone.id),
  );

  let computedOverdueLabel: string | null = null;
  if (milestone.dueDate && isBefore(parseISO(milestone.dueDate), today)) {
    const daysLate = differenceInCalendarDays(
      today,
      parseISO(milestone.dueDate),
    );
    computedOverdueLabel = `${daysLate} day${daysLate > 1 ? "s" : ""} ago`;
  }

  const handleCompletion = () => {
    deleteMilestone(milestone.id);
  };

  const handleEdit = () => {
    if (onEdit) onEdit(milestone);
    setMilestoneToEdit(milestone);
    setIsMilestoneDialogOpen(true);
  };

  return (
    <div
      data-entity-card="true"
      data-entity-type="milestone"
      data-entity-id={milestone.id}
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
        {/* Left: triangle + content */}
        <div className="flex items-start gap-2">
          <span
            className="triangle mt-1"
            style={{
              borderTopColor: modeColor,
              marginTop: 8,
            }}
          />
          <div className="flex flex-col">
            <div
              className="group/edit flex items-center gap-2 cursor-pointer"
              onClick={handleEdit}
            >
              <span className="text-md font-semibold">{milestone.title}</span>
              <PencilSquareIcon className="h-4 w-4 text-gray-400 opacity-0 group-hover/edit:opacity-100 transition-opacity" />
            </div>
            {milestone.dueTime && (
              <p className="text-xs text-black-500">
                Due: {`at ${milestone.dueTime.slice(0, 5)}`}
              </p>
            )}

            {breadcrumb && (
              <p className="text-xs text-gray-700 font-medium mt-1">
                {breadcrumb}
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
          <AssigneeAvatar assignee={milestone.assignee} size={18} />
          <EntityDragHandle
            entityKind="milestone"
            entityId={milestone.id}
            className="p-1 rounded"
            // Mirror tasks:
            //  - Today (sortable): listeners + activatorRef
            //  - Not Today (draggable): attributes + listeners
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
            aria-label={`Mark "${milestone.title}" as complete`}
            style={{ accentColor: modeColor }}
          />
        </div>
      </div>
    </div>
  );
}
