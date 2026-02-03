// src/components/entities/tasks/renderers/calendar/TaskRendererCalendar.tsx
"use client";

import { Task } from "@shared/types/Task";
import { Mode } from "@shared/types/Mode";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { useDeleteTask } from "@shared/api/hooks/tasks/useDeleteTask";
import { useDialogStore } from "@/lib/dialogs/useDialogStore";
import clsx from "clsx";
import {
  parseISO,
  differenceInCalendarDays,
  isBefore,
  startOfToday,
} from "date-fns";

import { useSelectionStore } from "@/lib/store/useSelectionStore";
import { useTaskStore } from "@shared/store/useTaskStore"; // ⬅️ use live store
import EntityDragHandle from "@/components/common/EntityDragHandle";

import type {
  DragAttributes,
  DragListeners,
} from "../../../../dnd/calendar/dragTypes";

type Props = {
  task: Task;
  mode: Mode | undefined;
  showModeTitle?: boolean;
  breadcrumb?: string;
  activatorRef?: (el: HTMLElement | null) => void;
  dragAttributes?: DragAttributes;
  dragListeners?: DragListeners;
};

export default function TaskRendererCalendar({
  task,
  mode,
  showModeTitle = false,
  breadcrumb,
  dragListeners,
  activatorRef,
}: Props) {
  const modeColor = mode?.color || "#000";
  const { mutate: deleteTask } = useDeleteTask();
  const { setIsTaskDialogOpen, setTaskToEdit } = useDialogStore();

  // ⬇️ Pull the freshest task by id; fall back to the prop if not present yet
  const liveTask = useTaskStore((s) => {
    // support either selector shapes
    const byId = (s as any).byId?.(task.id) ?? (s as any).tasksById?.[task.id];
    return (byId as Task | undefined) ?? task;
  });

  const today = startOfToday();
  const isSelected = useSelectionStore((s) =>
    s.isSelected("task", liveTask.id),
  );

  let computedOverdueLabel: string | null = null;
  if (liveTask.dueDate) {
    const d = parseISO(liveTask.dueDate);
    if (isBefore(d, today)) {
      const daysLate = differenceInCalendarDays(today, d);
      computedOverdueLabel = `${daysLate} day${daysLate > 1 ? "s" : ""} ago`;
    }
  }

  return (
    <div
      data-entity-card="true"
      data-entity-type="task"
      data-entity-id={liveTask.id}
      className={clsx(
        "px-2 sm:px-4 py-2 sm:py-3 bg-white group transition hover:bg-gray-50 relative",
        isSelected ? "ring-2 z-10" : "border-t border-transparent",
      )}
      style={
        isSelected
          ? { boxShadow: `0 0 0 2px ${modeColor}`, backgroundColor: "#f0f8ff" }
          : undefined
      }
    >
      <div className="flex justify-between items-start">
        {/* Left */}
        <div className="flex items-start gap-2">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
            style={{ backgroundColor: modeColor }}
            title={mode?.title}
          />
          <div className="flex flex-col">
            <div
              className="group/edit flex items-center gap-2 cursor-pointer"
              onClick={() => {
                // keep your existing dialog API; it can still receive the object
                setTaskToEdit(liveTask);
                setIsTaskDialogOpen(true);
              }}
            >
              <span className="text-sm font-semibold">{liveTask.title}</span>
              <PencilSquareIcon className="h-4 w-4 text-gray-400 opacity-0 group-hover/edit:opacity-100 transition-opacity" />
            </div>

            {liveTask.dueTime && (
              <p className="text-xs text-black-500">
                Due: {`at ${liveTask.dueTime.slice(0, 5)}`}
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

        {/* Right: drag handle + checkbox */}
        <div className="flex items-center gap-2">
          <EntityDragHandle
            entityKind="task"
            entityId={liveTask.id}
            className="p-1 rounded"
            onPointerDown={dragListeners?.onPointerDown as any}
            onKeyDown={dragListeners?.onKeyDown as any}
            activatorRef={activatorRef}
          />
          <input
            type="checkbox"
            onClick={(e) => {
              e.stopPropagation();
              deleteTask(liveTask.id);
            }}
            onChange={() => {}}
            className="w-4 h-4 rounded-full border border-gray-400 checked:bg-black checked:border-black cursor-pointer"
            aria-label={`Mark "${liveTask.title}" as complete`}
            style={{ accentColor: modeColor }}
          />
        </div>
      </div>
    </div>
  );
}
