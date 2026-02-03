// components/entities/goals/renderers/dashboard/GoalRendererDashboard.tsx
"use client";

import { Goal } from "@shared/types/Goal";
import { Mode } from "@shared/types/Mode";
import clsx from "clsx";
import { format, parseISO } from "date-fns";
import { useDialogStore } from "@/lib/dialogs/useDialogStore";
import { useDeleteGoal } from "@shared/api/hooks/goals/useDeleteGoal";

import Icon from "../../UI/GoalIcon";
import GoalTarget from "../../UI/GoalTarget";
import { PencilSquareIcon } from "@heroicons/react/24/outline";

import { useSelectionStore } from "../../../../../lib/store/useSelectionStore";
import EntityDragHandle from "../../../../common/EntityDragHandle";
import { useEntityUIStore } from "@/lib/store/useEntityUIStore";

type Props = {
  goal: Goal;
  mode: Mode; // kept for API compatibility even if unused here
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onEdit?: (goal: Goal) => void;
  modeColor?: string;
  variant?: "dashboard" | "title";
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
};

export default function GoalRendererDashboard({
  goal,
  mode,
  collapsed,
  onToggleCollapse,
  onEdit,
  modeColor = "#000",
  variant = "dashboard",
  dragHandleProps,
}: Props) {
  // avoid unused-var lint without changing the public API
  void mode;

  const { setGoalToEdit, setIsGoalDialogOpen } = useDialogStore();
  const { mutate: deleteGoal } = useDeleteGoal();
  const isTitle = variant === "title";

  // selection
  const isSelected = useSelectionStore((s) => s.isSelected("goal", goal.id));

  // collapse (store with optional overrides)
  const storeCollapsed = useEntityUIStore((s) => !!s.collapsed.goal?.[goal.id]);
  const toggleInStore = () =>
    useEntityUIStore.getState().toggleCollapsed("goal", goal.id);

  const isCollapsed = collapsed ?? storeCollapsed;
  const handleToggleCollapse = onToggleCollapse ?? toggleInStore;

  const handleEdit = () => {
    setGoalToEdit(goal);
    setIsGoalDialogOpen(true);
    onEdit?.(goal);
  };

  const handleCompletion = () => {
    deleteGoal(goal.id);
  };

  return (
    <div
      className={clsx(
        "flex items-center justify-between px-3 py-2 md:px-4 md:py-2.5 rounded-md border bg-white hover:bg-gray-50 transition",
        "border-gray-300",
        isSelected && "ring-2",
      )}
      style={
        isSelected
          ? { boxShadow: `0 0 0 2px ${modeColor}`, backgroundColor: "#f0f8ff" }
          : undefined
      }
      data-entity-card="true"
      data-entity-type="goal"
      data-entity-id={goal.id}
    >
      {/* LEFT: drag handle (collapsed only) + collapse/expand icon + title */}
      <div className="flex items-center gap-2 min-w-0">
        {isCollapsed === true && (
          <EntityDragHandle
            data-drag-handle
            entityKind="goal"
            entityId={goal.id}
            canDrag={!!dragHandleProps}
            className="p-1 rounded"
            {...dragHandleProps}
          />
        )}

        <button
          type="button"
          onClick={handleToggleCollapse}
          aria-label={isCollapsed ? "Expand goal" : "Collapse goal"}
          className="w-6 h-6 flex items-center justify-center rounded transition-all duration-200 cursor-pointer"
        >
          {isCollapsed ? (
            // COLLAPSED – CSS bullseye using mode color
            <div
              className={clsx(
                "flex items-center justify-center border-2 rounded-full",
                isTitle ? "w-6 h-6" : "w-5 h-5",
              )}
              style={{ borderColor: modeColor }}
            >
              <div
                className={clsx(
                  "rounded-full",
                  isTitle ? "w-2 h-2" : "w-1.5 h-1.5",
                )}
                style={{ backgroundColor: modeColor }}
              />
            </div>
          ) : (
            // EXPANDED – filled with mode color, white target icon
            <div
              className={clsx(
                "flex items-center justify-center rounded-full",
                isTitle ? "w-6 h-6" : "w-5 h-5",
              )}
              style={{ backgroundColor: modeColor }}
            >
              <Icon size={isTitle ? 20 : 16} className="text-white">
                <GoalTarget />
              </Icon>
            </div>
          )}
        </button>

        {/* Title + meta (click to edit) */}
        <div
          className="group/edit flex flex-col cursor-pointer min-w-0"
          onClick={handleEdit}
        >
          <div className="flex items-center gap-2 min-w-0">
            <h3
              className={clsx(
                "font-bold leading-snug text-gray-900 break-words whitespace-normal",
                isTitle ? "text-lg md:text-2xl" : "text-base md:text-xl",
              )}
            >
              {goal.title}
            </h3>
            {!isTitle && (
              <PencilSquareIcon className="h-4 w-4 text-gray-400 opacity-0 group-hover/edit:opacity-100 transition-opacity" />
            )}
          </div>

          {goal.description && !isCollapsed && (
            <p className="text-xs text-gray-600">{goal.description}</p>
          )}

          {goal.dueDate && (
            <p className="text-[10px] md:text-xs text-gray-500">
              Due: {format(parseISO(goal.dueDate), "EEE, MMM d")}
              {goal.dueTime && ` at ${goal.dueTime.slice(0, 5)}`}
            </p>
          )}
        </div>
      </div>

      {/* RIGHT: checkbox (collapsed only) — checking deletes goal */}
      {isCollapsed === true ? (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            className="w-4 h-4 rounded-full border border-gray-400 checked:bg-black checked:border-black cursor-pointer"
            style={{ accentColor: modeColor }}
            aria-label={`Delete goal "${goal.title}"`}
            onClick={(e) => e.stopPropagation()}
            onChange={handleCompletion}
          />
        </div>
      ) : (
        <div />
      )}
    </div>
  );
}
