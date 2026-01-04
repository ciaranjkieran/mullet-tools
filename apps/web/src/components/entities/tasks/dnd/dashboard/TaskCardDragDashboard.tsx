"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task } from "@shared/types/Task";
import { Mode } from "@shared/types/Mode";
import TaskRendererDashboard from "../../renderers/dashboard/TaskRendererDashboard";

type Props = { task: Task; modes: Mode[] };

export default function TaskCardDragDashboard({ task, modes }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isSorting,
  } = useSortable({
    id: task.id,
    // Avoid flip animation on index change
    animateLayoutChanges: ({ isSorting, wasDragging }) =>
      !(isSorting || wasDragging),
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging || isSorting ? undefined : transition,
    zIndex: isDragging ? 50 : undefined,
    // 🔑 Leave a gap in the list while dragging this item
    opacity: isDragging ? 0 : 1,
  };

  const mode = modes.find((m) => m.id === task.modeId);
  if (!mode) return null;

  return (
    <div ref={setNodeRef} style={style}>
      <TaskRendererDashboard
        task={task}
        mode={mode}
        dragHandleProps={
          task.dueDate ? undefined : { ...listeners, ...attributes }
        } // ← only when draggable
      />
    </div>
  );
}
