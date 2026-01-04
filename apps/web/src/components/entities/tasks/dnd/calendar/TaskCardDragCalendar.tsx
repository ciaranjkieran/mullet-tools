"use client";

import { Task } from "@shared/types/Task";
import { Mode } from "@shared/types/Mode";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import TaskRendererCalendar from "../../renderers/calendar/TaskRendererCalendar";

type Props = {
  task: Task;
  mode: Mode | undefined;
  showModeTitle?: boolean;
  breadcrumb?: string;
};

export default function TaskCardDragCalendar({
  task,
  mode,
  showModeTitle,
  breadcrumb,
}: Props) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `task-${task.id}`,
    data: { type: "task", task },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskRendererCalendar
        task={task}
        mode={mode}
        showModeTitle={showModeTitle}
        breadcrumb={breadcrumb}
      />
    </div>
  );
}
