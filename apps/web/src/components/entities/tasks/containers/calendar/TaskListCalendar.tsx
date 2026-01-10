// src/components/entities/tasks/containers/calendar/TaskListCalendar.tsx
"use client";

import { format, parseISO } from "date-fns";
import { Task } from "@shared/types/Task";
import { Mode } from "@shared/types/Mode";
import { Maps, getEntityBreadcrumb } from "@shared/utils/getEntityBreadcrumb";

import TaskRendererCalendar from "@/components/entities/tasks/renderers/calendar/TaskRendererCalendar";
import CalendarEntityDragCard from "../../../../dnd/calendar/CalendarEntityDragCard";
import { containerForTask } from "../../../../dnd/calendar/grouping";

import type {
  DragAttributes,
  DragListeners,
} from "@/components/dnd/calendar/dragTypes";

type Props = {
  tasks: Task[];
  mode: Mode | undefined;
  showModeTitle?: boolean;
  maps: Maps;
  isToday?: boolean; // if this exists in your real file, keep it here
};

function minutesFromTime(t?: string | null): number {
  if (!t) return Number.POSITIVE_INFINITY; // "no time" last
  const [hh, mm] = t.split(":").map((v) => parseInt(v, 10));
  return Number.isNaN(hh) || Number.isNaN(mm)
    ? Number.POSITIVE_INFINITY
    : hh * 60 + mm;
}

function parentKey(task: Task): string {
  const c = containerForTask(task);
  return `${c.kind}:${c.id ?? "none"}`;
}

export default function TaskListCalendar({
  tasks,
  mode,
  showModeTitle,
  maps,
  isToday,
}: Props) {
  // if present, avoid unused-var lint (UI-only flag)
  void isToday;

  // Deterministic list order:
  // time → parent → id
  const display = [...tasks].sort((a, b) => {
    const ta = minutesFromTime(a.dueTime);
    const tb = minutesFromTime(b.dueTime);
    if (ta !== tb) return ta - tb;

    const ak = parentKey(a);
    const bk = parentKey(b);
    if (ak !== bk) return ak < bk ? -1 : 1;

    return a.id - b.id;
  });

  return (
    <div className="flex flex-col gap-2">
      {display.map((task) => (
        <CalendarEntityDragCard
          key={`task:${task.id}`}
          meta={{
            entityType: "task",
            id: task.id,
            modeId: task.modeId,
            dateStr: task.dueDate
              ? format(parseISO(task.dueDate), "yyyy-MM-dd")
              : null,
            title: task.title,
          }}
          variant="draggable"
        >
          {({ dragAttributes, dragListeners, setActivatorNodeRef }) => (
            <TaskRendererCalendar
              task={task}
              mode={mode}
              showModeTitle={showModeTitle}
              breadcrumb={getEntityBreadcrumb(task, maps, {
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
