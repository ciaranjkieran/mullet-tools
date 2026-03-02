// components/entities/milestones/renderers/dashboard/MilestoneRendererDashboard.tsx
"use client";

import { Milestone } from "@shared/types/Milestone";
import { Mode } from "@shared/types/Mode";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { parseISO } from "date-fns";
import { formatDateLabel } from "@/lib/utils/formatDateLabel";

import { useDeleteMilestone } from "@shared/api/hooks/milestones/useDeleteMilestone";
import { useDialogStore } from "../../../../../lib/dialogs/useDialogStore";

// selection + reusable handle
import { useSelectionStore } from "../../../../../lib/store/useSelectionStore";
import { useShiftClickSelect } from "../../../../../lib/hooks/useShiftClickSelect";
import EntityDragHandle from "../../../../common/EntityDragHandle";
import AssigneeAvatar from "../../../../common/AssigneeAvatar";

// NEW: global collapse store
import { useEntityUIStore } from "@/lib/store/useEntityUIStore";

interface Props {
  milestone: Milestone;
  mode: Mode;
  /** If provided, overrides store-driven collapsed state */
  collapsed?: boolean;
  /** If provided, overrides store toggle */
  onToggleCollapse?: () => void;
  modeColor?: string;
  variant?: undefined | "title";
  overdueLabel?: string;
  /** DnD listeners/attributes injected by wrapper when draggable */
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

export default function MilestoneRenderer({
  milestone,
  mode,
  collapsed,
  onToggleCollapse,
  modeColor = "#000",
  variant,
  dragHandleProps,
}: Props) {
  const isTitle = variant === "title";
  const baseClasses =
    "flex items-center justify-between px-3 py-2 md:px-4 md:py-2.5 rounded-md border bg-muted group";

  const { mutate: deleteMilestone } = useDeleteMilestone();
  const { setMilestoneToEdit, setIsMilestoneDialogOpen } = useDialogStore();

  // selection highlight
  const isSelected = useSelectionStore((s) =>
    s.isSelected("milestone", milestone.id),
  );
  const { onClickCapture, onMouseDownCapture } = useShiftClickSelect("milestone", milestone.id);

  // ---- Collapse (store-backed with optional overrides) ----
  const storeCollapsed = useEntityUIStore(
    (s) => !!s.collapsed.milestone?.[milestone.id],
  );
  const toggleInStore = () =>
    useEntityUIStore.getState().toggleCollapsed("milestone", milestone.id);

  const isCollapsed = collapsed ?? storeCollapsed;
  const handleToggleCollapse = onToggleCollapse ?? toggleInStore;

  // actions
  const handleCompletion = () => {
    deleteMilestone(milestone.id);
  };

  const handleEdit = () => {
    setMilestoneToEdit(milestone);
    setIsMilestoneDialogOpen(true);
  };

  return (
    <div
      data-entity-card="true"
      data-entity-type="milestone"
      data-entity-id={milestone.id}
      onClickCapture={onClickCapture}
      onMouseDownCapture={onMouseDownCapture}
      className={clsx(baseClasses, isSelected && "ring-2")}
      style={
        isSelected
          ? { boxShadow: `0 0 0 2px ${modeColor}`, backgroundColor: "#f0f8ff" }
          : undefined
      }
    >
      {/* LEFT: drag handle (only when collapsed) + collapse toggle + title */}
      <div className="flex items-center gap-2 min-w-0">
        {isCollapsed === true && (
          <EntityDragHandle
            data-drag-handle
            entityKind="milestone"
            entityId={milestone.id}
            // actual DnD enablement is controlled by whether dragHandleProps are passed
            canDrag={!!dragHandleProps}
            className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            {...(dragHandleProps as any)}
          />
        )}

        <button
          type="button"
          onClick={handleToggleCollapse}
          className="flex items-center justify-center p-1 rounded hover:bg-gray-100 cursor-pointer"
          style={{
            width: isTitle ? 28 : 20,
            height: isTitle ? 28 : 20,
          }}
          aria-label={isCollapsed ? "Expand milestone" : "Collapse milestone"}
        >
          <span
            className="triangle"
            style={{
              borderTopColor: modeColor,
              borderTopWidth: isTitle ? 20 : 10,
              borderLeftWidth: isTitle ? 12 : 6,
              borderRightWidth: isTitle ? 12 : 6,
              transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          />
        </button>

        <div
          className={clsx(
            "flex flex-col min-w-0",
            !isTitle && "group/edit cursor-pointer",
          )}
          {...(!isTitle && { onClick: handleEdit })}
        >
          <div className="flex items-center gap-2 min-w-0">
            <h3
              className={clsx(
                "font-semibold break-words whitespace-normal",
                isTitle ? "text-lg md:text-xl" : "text-sm md:text-base",
              )}
            >
              {milestone.title}
            </h3>
            {!isTitle && (
              <PencilSquareIcon className="h-4 w-4 text-gray-400 opacity-0 group-hover/edit:opacity-100 transition-opacity" />
            )}
          </div>

          {milestone.dueDate && (
            <p className="text-xs text-gray-500">
              Due: {formatDateLabel(parseISO(milestone.dueDate), "EEE, MMM d")}
              {milestone.dueTime && ` at ${milestone.dueTime.slice(0, 5)}`}
            </p>
          )}
        </div>
      </div>

      {/* RIGHT: assignee avatar + checkbox (only when collapsed) */}
      {isCollapsed === true ? (
        <div className="flex items-center gap-2">
          <AssigneeAvatar assignee={milestone.assignee} size={20} />
          <input
            type="checkbox"
            className="w-4 h-4 rounded-full border border-gray-400 checked:bg-black checked:border-black cursor-pointer"
            style={{ accentColor: modeColor }}
            onClick={(e) => e.stopPropagation()}
            onChange={handleCompletion}
            aria-label={`Mark "${milestone.title}" as complete`}
          />
        </div>
      ) : (
        <AssigneeAvatar assignee={milestone.assignee} size={20} />
      )}
    </div>
  );
}
