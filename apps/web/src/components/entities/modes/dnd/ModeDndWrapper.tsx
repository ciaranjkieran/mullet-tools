"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ReactNode, useEffect, useState, useRef } from "react";
import { useTaskStore } from "@shared/store/useTaskStore";
import { useUpdateTaskPositions } from "@shared/api/hooks/tasks/useUpdateTaskPositions";
import { createClickOutsideHandler } from "../../../../lib/utils/CreateClickOutsideHandler";

type Props = {
  children: ReactNode;
  modeId: number;
  dialogOpen?: boolean;
};

export default function ModeDndWrapper({
  children,
  modeId,
  dialogOpen = false,
}: Props) {
  const updatePositions = useUpdateTaskPositions();
  const tasks = useTaskStore((s) => s.tasks);
  const reorderTasksInMode = useTaskStore((s) => s.reorderTasksInMode);
  const updateTaskPositionsLocally = useTaskStore(
    (s) => s.updateTaskPositionsLocally
  );
  const clearSelectedTasks = useTaskStore((s) => s.clearSelectedTasks);
  const selectedTaskIds = useTaskStore((s) => s.selectedTaskIds);

  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);

  const unscheduledTasks = tasks
    .filter((t) => t.modeId === modeId && !t.dueDate)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveTaskId(Number(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTaskId(null);

    if (!active || !over || active.id === over.id) return;

    const isMultiDrag = selectedTaskIds.includes(Number(active.id));

    const sortedTasks = tasks
      .filter((t) => t.modeId === modeId && !t.dueDate)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    const movingIds = isMultiDrag ? selectedTaskIds : [Number(active.id)];
    const staticTasks = sortedTasks.filter((t) => !movingIds.includes(t.id));
    const movingTasks = sortedTasks.filter((t) => movingIds.includes(t.id));

    const activeIndex = sortedTasks.findIndex((t) => t.id === active.id);
    const overIndex = sortedTasks.findIndex((t) => t.id === over.id);
    const isMovingDown = overIndex > activeIndex;

    const insertAt = staticTasks.findIndex((t) => t.id === over.id);
    const targetIndex = isMovingDown ? insertAt + 1 : insertAt;

    const newOrder = [
      ...staticTasks.slice(0, targetIndex),
      ...movingTasks,
      ...staticTasks.slice(targetIndex),
    ];

    const updates = newOrder.map((t, index) => ({ id: t.id, position: index }));

    reorderTasksInMode(
      modeId,
      newOrder.map((t) => t.id)
    );
    updateTaskPositionsLocally(updates);
    updatePositions.mutate(updates);
  }

  const dialogOpenRef = useRef<boolean>(dialogOpen);
  useEffect(() => {
    dialogOpenRef.current = dialogOpen;
  }, [dialogOpen]);

  useEffect(() => {
    const handler = createClickOutsideHandler({
      dialogOpenRef,
      getSelectedIds: () => useTaskStore.getState().selectedTaskIds,
      clearSelection: clearSelectedTasks,
      selector: "[data-task-id]",
      attr: "data-task-id",
    });

    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [clearSelectedTasks]);

  if (unscheduledTasks.length === 0) return null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={unscheduledTasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        {children}
      </SortableContext>

      <DragOverlay>
        {activeTaskId && selectedTaskIds.length > 1 ? (
          <div className="bg-white shadow-md px-3 py-2 rounded border text-sm font-semibold">
            {selectedTaskIds.length} tasks
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
