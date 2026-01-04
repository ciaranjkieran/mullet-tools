"use client";

import { Project } from "@shared/types/Project";
import { Mode } from "@shared/types/Mode";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useDeleteProject } from "@shared/api/hooks/projects/useDeleteProject";
import { useDialogStore } from "@/lib/dialogs/useDialogStore";
import {
  parseISO,
  isBefore,
  differenceInCalendarDays,
  startOfToday,
} from "date-fns";

import { useSelectionStore } from "@/lib/store/useSelectionStore";
import EntityDragHandle from "@/components/common/EntityDragHandle";

import type {
  DragAttributes,
  DragListeners,
} from "../../../../dnd/calendar/dragTypes";

type Props = {
  project: Project;
  mode: Mode | undefined;
  onEdit?: (project: Project) => void;
  showModeTitle?: boolean;
  breadcrumb?: string;

  // injected by CalendarEntityDragCard
  dragAttributes?: DragAttributes;
  dragListeners?: DragListeners;
  activatorRef?: (el: HTMLElement | null) => void; // ✅ for sortable handle
};

export default function ProjectRendererCalendar({
  project,
  mode,
  onEdit,
  showModeTitle = false,
  breadcrumb,
  dragAttributes,
  dragListeners,
  activatorRef,
}: Props) {
  const modeColor = mode?.color || "#000";
  const { mutate: deleteProject } = useDeleteProject();
  const { setProjectToEdit, setIsProjectDialogOpen } = useDialogStore();
  const today = startOfToday();

  const isSelected = useSelectionStore((s) =>
    s.isSelected("project", project.id)
  );

  let computedOverdueLabel: string | null = null;
  if (project.dueDate && isBefore(parseISO(project.dueDate), today)) {
    const daysLate = differenceInCalendarDays(today, parseISO(project.dueDate));
    computedOverdueLabel = `${daysLate} day${daysLate > 1 ? "s" : ""} ago`;
  }

  const handleEdit = () => {
    onEdit?.(project);
    setProjectToEdit(project);
    setIsProjectDialogOpen(true);
  };

  const handleCompletion = () => deleteProject(project.id);

  return (
    <div
      data-entity-card="true"
      data-entity-type="project"
      data-entity-id={project.id}
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
        {/* Left: icon + content */}
        <div className="flex items-start gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill={modeColor}
            className="w-6 h-6 flex-shrink-0 mt-0.5"
          >
            <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h5.379a1.5 1.5 0 0 1 1.06.44l1.621 1.62H19.5A1.5 1.5 0 0 1 21 6.56V18a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 18V4.5Z" />
          </svg>

          <div className="flex flex-col">
            <div
              className="group/edit flex items-center gap-2 cursor-pointer"
              onClick={handleEdit}
            >
              <span className="text-md font-semibold">{project.title}</span>
              <PencilSquareIcon className="h-4 w-4 text-gray-400 opacity-0 group-hover/edit:opacity-100 transition-opacity" />
            </div>
            {project.dueTime && (
              <p className="text-xs text-black-500">
                Due: {`at ${project.dueTime.slice(0, 5)}`}
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
            entityKind="project"
            entityId={project.id}
            className="p-1 rounded"
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
            aria-label={`Mark "${project.title}" as complete`}
            style={{ accentColor: modeColor }}
          />
        </div>
      </div>
    </div>
  );
}
