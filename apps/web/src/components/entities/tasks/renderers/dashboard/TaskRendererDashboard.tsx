"use client";

import { Task } from "@shared/types/Task";
import { Mode } from "@shared/types/Mode";
import { parseISO } from "date-fns";
import { formatDateLabel } from "@/lib/utils/formatDateLabel";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useDeleteTask } from "@shared/api/hooks/tasks/useDeleteTask";
import { useDialogStore } from "@/lib/dialogs/useDialogStore";
import { useSelectionStore } from "../../../../../lib/store/useSelectionStore";
import { useShiftClickSelect } from "../../../../../lib/hooks/useShiftClickSelect";
import EntityDragHandle from "../../../../common/EntityDragHandle";
import AssigneeAvatar from "../../../../common/AssigneeAvatar";

type Props = {
  task: Task;
  mode: Mode;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
};

export default function TaskRendererDashboard({
  task,
  mode,
  dragHandleProps,
}: Props) {
  const modeColor = mode.color || "#000";
  const { mutate: deleteTask } = useDeleteTask();
  const { setIsTaskDialogOpen, setTaskToEdit } = useDialogStore();
  const isSelected = useSelectionStore((s) => s.isSelected("task", task.id));
  const { onClickCapture, onMouseDownCapture } = useShiftClickSelect("task", task.id);

  const handleCompletion = () => deleteTask(task.id);

  return (
    <div
      data-entity-card="true"
      data-entity-type="task"
      data-entity-id={task.id}
      onClickCapture={onClickCapture}
      onMouseDownCapture={onMouseDownCapture}
      className={clsx(
        "border rounded px-3 py-2 md:px-4 md:py-2.5 shadow-sm relative group transition",
        "cursor-default text-left",
        isSelected ? "ring-2" : "bg-white",
      )}
      style={
        isSelected
          ? { boxShadow: `0 0 0 2px ${modeColor}`, backgroundColor: "#f0f8ff" }
          : undefined
      }
    >
      <div className="flex justify-between items-start gap-2">
        {/* Left: dot + text */}
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <span
            className="mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: modeColor }}
          />
          {/* text column */}
          <div className="flex flex-col items-start text-left min-w-0 max-w-full">
            <button
              type="button"
              className="group/edit inline-flex items-center gap-1.5 cursor-pointer max-w-full"
              onClick={(e) => {
                e.stopPropagation();
                setTaskToEdit(task);
                setIsTaskDialogOpen(true);
              }}
            >
              <span className="block w-full text-left text-[13px] md:text-sm font-semibold leading-tight break-words whitespace-normal">
                {task.title}
              </span>
              <PencilSquareIcon className="h-4 w-4 text-gray-400 opacity-0 group-hover/edit:opacity-100 transition-opacity flex-shrink-0" />
            </button>

            {task.dueDate && (
              <div className="mt-0.5 flex items-center gap-1 text-[10px] md:text-xs text-gray-700 leading-snug">
                <span className="break-words whitespace-normal text-left">
                  Due: {formatDateLabel(parseISO(task.dueDate), "EEE, MMM d")}
                  {task.dueTime && ` at ${task.dueTime.slice(0, 5)}`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: avatar + handle + checkbox */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <AssigneeAvatar assignee={task.assignee} size={20} />
          <EntityDragHandle
            data-drag-handle
            entityKind="task"
            entityId={task.id}
            canDrag={!task.dueDate}
            className="p-1 rounded"
            {...(dragHandleProps ?? {})}
          />
          <input
            type="checkbox"
            className="w-4 h-4 rounded-full border border-gray-400 checked:bg-black checked:border-black cursor-pointer"
            style={{ accentColor: modeColor }}
            onChange={(e) => {
              e.stopPropagation();
              handleCompletion();
            }}
            aria-label={`Mark "${task.title}" as complete`}
          />
        </div>
      </div>
    </div>
  );
}
