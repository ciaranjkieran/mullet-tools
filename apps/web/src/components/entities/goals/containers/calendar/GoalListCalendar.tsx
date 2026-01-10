"use client";

import { format, parseISO } from "date-fns";
import { Goal } from "@shared/types/Goal";
import { Mode } from "@shared/types/Mode";

import CalendarEntityDragCard from "../../../../dnd/calendar/CalendarEntityDragCard";
import GoalRendererCalendar from "@/components/entities/goals/renderers/calendar/GoalRendererCalendar";

import type {
  DragAttributes,
  DragListeners,
} from "@/components/dnd/calendar/dragTypes";

type Props = {
  goals: Goal[];
  mode: Mode | undefined;
  onEdit?: (goal: Goal) => void;
  showModeTitle?: boolean;
  isToday?: boolean; // no longer affects DnD; kept for UI if needed
};

function minutesFromTime(t?: string | null): number {
  if (!t) return Number.POSITIVE_INFINITY;
  const [hh, mm] = t.split(":").map((v) => parseInt(v, 10));
  return Number.isNaN(hh) || Number.isNaN(mm)
    ? Number.POSITIVE_INFINITY
    : hh * 60 + mm;
}

export default function GoalListCalendar({
  goals,
  mode,
  onEdit,
  showModeTitle,
}: Props) {
  const display = [...goals].sort((a, b) => {
    const ta = minutesFromTime(a.dueTime);
    const tb = minutesFromTime(b.dueTime);
    if (ta !== tb) return ta - tb;
    return a.id - b.id;
  });

  return (
    <div className="flex flex-col gap-2">
      {display.map((goal) => (
        <CalendarEntityDragCard
          key={`goal:${goal.id}`}
          meta={{
            entityType: "goal",
            id: goal.id,
            modeId: goal.modeId,
            dateStr: goal.dueDate
              ? format(parseISO(goal.dueDate), "yyyy-MM-dd")
              : null,
            title: goal.title,
          }}
          variant="draggable"
        >
          {({ dragAttributes, dragListeners, setActivatorNodeRef }) => (
            <GoalRendererCalendar
              goal={goal}
              mode={mode}
              onEdit={onEdit}
              showModeTitle={showModeTitle}
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
