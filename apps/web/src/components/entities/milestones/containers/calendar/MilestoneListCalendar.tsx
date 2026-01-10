// src/components/entities/milestones/containers/calendar/MilestoneListCalendar.tsx
"use client";

import { format, parseISO } from "date-fns";
import { Milestone } from "@shared/types/Milestone";
import { Mode } from "@shared/types/Mode";
import { getEntityBreadcrumb } from "@shared/utils/getEntityBreadcrumb";
import { Maps } from "@shared/types/Maps";

import MilestoneRendererCalendar from "@/components/entities/milestones/renderers/calendar/MilestoneRendererCalendar";
import CalendarEntityDragCard from "../../../../dnd/calendar/CalendarEntityDragCard";

import type {
  DragAttributes,
  DragListeners,
} from "@/components/dnd/calendar/dragTypes";

type Props = {
  milestones: Milestone[];
  mode: Mode | undefined;
  onEdit?: (milestone: Milestone) => void;
  showModeTitle?: boolean;
  maps: Maps;
  isToday?: boolean; // no longer affects DnD; kept for UI if you need
};

function minutesFromTime(t?: string | null): number {
  if (!t) return Number.POSITIVE_INFINITY; // "no time" last
  const [hh, mm] = t.split(":").map((v) => parseInt(v, 10));
  return Number.isNaN(hh) || Number.isNaN(mm)
    ? Number.POSITIVE_INFINITY
    : hh * 60 + mm;
}

export default function MilestoneListCalendar({
  milestones,
  mode,
  onEdit,
  showModeTitle,
  maps,
}: Props) {
  // Deterministic order: time -> id
  const display = [...milestones].sort((a, b) => {
    const ta = minutesFromTime(a.dueTime);
    const tb = minutesFromTime(b.dueTime);
    if (ta !== tb) return ta - tb;
    return a.id - b.id;
  });

  return (
    <div className="flex flex-col gap-2">
      {display.map((milestone) => (
        <CalendarEntityDragCard
          key={`milestone:${milestone.id}`}
          meta={{
            entityType: "milestone",
            id: milestone.id,
            modeId: milestone.modeId,
            dateStr: milestone.dueDate
              ? format(parseISO(milestone.dueDate), "yyyy-MM-dd")
              : null,
            title: milestone.title,
          }}
          variant="draggable"
        >
          {({ dragAttributes, dragListeners, setActivatorNodeRef }) => (
            <MilestoneRendererCalendar
              milestone={milestone}
              mode={mode}
              onEdit={onEdit}
              showModeTitle={showModeTitle}
              breadcrumb={getEntityBreadcrumb(milestone, maps, {
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
