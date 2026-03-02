// components/entities/projects/renderers/dashboard/ProjectRendererDashboard.tsx
"use client";

import { Project } from "@shared/types/Project";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { Folder as OutlineFolderIcon } from "lucide-react";
import clsx from "clsx";
import { parseISO } from "date-fns";
import { formatDateLabel } from "@/lib/utils/formatDateLabel";
import { useDialogStore } from "@/lib/dialogs/useDialogStore";
import { useDeleteProject } from "@shared/api/hooks/projects/useDeleteProject";

import { useSelectionStore } from "../../../../../lib/store/useSelectionStore";
import { useShiftClickSelect } from "../../../../../lib/hooks/useShiftClickSelect";
import EntityDragHandle from "../../../../common/EntityDragHandle";
import AssigneeAvatar from "../../../../common/AssigneeAvatar";
import { useEntityUIStore } from "@/lib/store/useEntityUIStore";

interface Props {
  project: Project;
  // optional overrides (used by overlays/testing)
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onEdit?: (project: Project) => void;
  modeColor?: string;
  variant?: undefined | "title";
  // dnd
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

export default function ProjectRenderer({
  project,
  collapsed,
  onToggleCollapse,
  onEdit,
  modeColor = "#000",
  variant,
  dragHandleProps,
}: Props) {
  const { setProjectToEdit, setIsProjectDialogOpen } = useDialogStore();
  const { mutate: deleteProject } = useDeleteProject();
  const isTitle = variant === "title";

  // selection
  const isSelected = useSelectionStore((s) =>
    s.isSelected("project", project.id),
  );
  const { onClickCapture, onMouseDownCapture } = useShiftClickSelect("project", project.id);

  // collapse (store with optional overrides)
  const storeCollapsed = useEntityUIStore(
    (s) => !!s.collapsed.project?.[project.id],
  );
  const toggleInStore = () =>
    useEntityUIStore.getState().toggleCollapsed("project", project.id);

  const isCollapsed = collapsed ?? storeCollapsed;
  const handleToggleCollapse = onToggleCollapse ?? toggleInStore;

  const handleEdit = () => {
    setProjectToEdit(project);
    setIsProjectDialogOpen(true);
    onEdit?.(project);
  };

  const handleCompletion = () => {
    deleteProject(project.id);
  };

  const baseClasses =
    "flex items-center justify-between px-3 py-2 md:px-4 md:py-2.5 rounded-md border bg-muted group";

  return (
    <div
      data-entity-card="true"
      data-entity-type="project"
      data-entity-id={project.id}
      onClickCapture={onClickCapture}
      onMouseDownCapture={onMouseDownCapture}
      className={clsx(baseClasses, isSelected && "ring-2")}
      style={
        isSelected
          ? { boxShadow: `0 0 0 2px ${modeColor}`, backgroundColor: "#f0f8ff" }
          : undefined
      }
    >
      {/* LEFT: drag handle (collapsed only) + folder toggle + title */}
      <div className="flex items-center gap-2 min-w-0">
        {isCollapsed === true && (
          <EntityDragHandle
            data-drag-handle
            entityKind="project"
            entityId={project.id}
            canDrag={!!dragHandleProps}
            className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            {...dragHandleProps}
          />
        )}

        <button
          type="button"
          onClick={handleToggleCollapse}
          aria-label={isCollapsed ? "Expand project" : "Collapse project"}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 transition cursor-pointer"
        >
          {isCollapsed ? (
            // filled folder using mode color when collapsed
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill={modeColor}
              className="w-6 h-6"
            >
              <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h5.379a1.5 1.5 0 0 1 1.06.44l1.621 1.62H19.5A1.5 1.5 0 0 1 21 6.56V18a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 18V4.5Z" />
            </svg>
          ) : (
            <OutlineFolderIcon
              className="w-6 h-6"
              style={{ color: modeColor }}
            />
          )}
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
                isTitle ? "text-lg md:text-xl" : "text-base md:text-lg",
              )}
            >
              {project.title}
            </h3>
            {!isTitle && (
              <PencilSquareIcon className="h-4 w-4 text-gray-400 opacity-0 group-hover/edit:opacity-100 transition-opacity" />
            )}
          </div>

          {project.dueDate && (
            <p className="text-[10px] md:text-xs text-gray-500">
              Due: {formatDateLabel(parseISO(project.dueDate), "EEE, MMM d")}
              {project.dueTime && ` at ${project.dueTime.slice(0, 5)}`}
            </p>
          )}
        </div>
      </div>

      {/* RIGHT: assignee avatar + completion checkbox (collapsed only) */}
      {isCollapsed === true ? (
        <div className="flex items-center gap-2">
          <AssigneeAvatar assignee={project.assignee} size={20} />
          <input
            type="checkbox"
            className="w-4 h-4 rounded-full border border-gray-400 checked:bg-black checked:border-black cursor-pointer"
            style={{ accentColor: modeColor }}
            aria-label={`Mark "${project.title}" as complete`}
            onClick={(e) => e.stopPropagation()}
            onChange={handleCompletion}
          />
        </div>
      ) : (
        <AssigneeAvatar assignee={project.assignee} size={20} />
      )}
    </div>
  );
}
