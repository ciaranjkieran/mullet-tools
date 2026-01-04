// src/components/entities/tasks/containers/calendar/TaskListCalendar.tsx
"use client";

import { format, parseISO } from "date-fns";
import { Task } from "@shared/types/Task";
import { Mode } from "@shared/types/Mode";
import { Maps, getEntityBreadcrumb } from "@shared/utils/getEntityBreadcrumb";
import TaskRendererCalendar from "@/components/entities/tasks/renderers/calendar/TaskRendererCalendar";
import CalendarEntityDragCard from "../../../../dnd/calendar/CalendarEntityDragCard";
import { containerForTask } from "../../../../dnd/calendar/grouping";

type Props = {
  tasks: Task[];
  mode: Mode | undefined;
  showModeTitle?: boolean;
  maps: Maps;
  isToday?: boolean; // now only affects UI you might render; not sorting/DnD
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
  isToday = false,
}: Props) {
  // Deterministic list order everywhere (incl. Today):
  // time → parent → id (ignore position for Today since we don't reorder)
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
          // ✅ Always draggable; no sortable anywhere in this list
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
              // draggable needs both attrs+listeners
              dragAttributes={dragAttributes as any}
              dragListeners={dragListeners as any}
              activatorRef={setActivatorNodeRef}
            />
          )}
        </CalendarEntityDragCard>
      ))}
    </div>
  );
}
