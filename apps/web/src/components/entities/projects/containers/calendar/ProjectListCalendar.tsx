// src/components/entities/projects/containers/calendar/ProjectListCalendar.tsx
"use client";

import { format, parseISO } from "date-fns";
import { Project } from "@shared/types/Project";
import { Mode } from "@shared/types/Mode";
import { Maps, getEntityBreadcrumb } from "@shared/utils/getEntityBreadcrumb";

import CalendarEntityDragCard from "../../../../dnd/calendar/CalendarEntityDragCard";
import ProjectRendererCalendar from "@/components/entities/projects/renderers/calendar/ProjectRendererCalendar";

import type {
  DragAttributes,
  DragListeners,
} from "@/components/dnd/calendar/dragTypes";

type Props = {
  projects: Project[];
  mode: Mode | undefined;
  onEdit?: (project: Project) => void;
  showModeTitle?: boolean;
  maps: Maps;
  isToday?: boolean; // no longer affects DnD; kept for UI if needed
};

function minutesFromTime(t?: string | null): number {
  if (!t) return Number.POSITIVE_INFINITY;
  const [hh, mm] = t.split(":").map((v) => parseInt(v, 10));
  return Number.isNaN(hh) || Number.isNaN(mm)
    ? Number.POSITIVE_INFINITY
    : hh * 60 + mm;
}

export default function ProjectListCalendar({
  projects,
  mode,
  onEdit,
  showModeTitle,
  maps,
}: Props) {
  const display = [...projects].sort((a, b) => {
    const ta = minutesFromTime(a.dueTime);
    const tb = minutesFromTime(b.dueTime);
    if (ta !== tb) return ta - tb;
    return a.id - b.id;
  });

  return (
    <div className="flex flex-col gap-2">
      {display.map((project) => (
        <CalendarEntityDragCard
          key={`project:${project.id}`}
          meta={{
            entityType: "project",
            id: project.id,
            modeId: project.modeId,
            dateStr: project.dueDate
              ? format(parseISO(project.dueDate), "yyyy-MM-dd")
              : null,
            title: project.title,
          }}
          variant="draggable"
        >
          {({ dragAttributes, dragListeners, setActivatorNodeRef }) => (
            <ProjectRendererCalendar
              project={project}
              mode={mode}
              onEdit={onEdit}
              showModeTitle={showModeTitle}
              breadcrumb={getEntityBreadcrumb(project, maps, {
                immediateOnly: true,
              })}
              dragAttributes={dragAttributes as DragAttributes | undefined}
              dragListeners={dragListeners as DragListeners | undefined}
              activatorRef={setActivatorNodeRef}
            />
          )}
        </CalendarEntityDragCard>
      ))}
    </div>
  );
}
