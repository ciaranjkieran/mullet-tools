"use client";

import {
  DndContext,
  closestCenter,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ReactNode, useEffect, useState, useRef } from "react";
import { useTaskStore } from "@shared/store/useTaskStore";
import { useUpdateTaskPositions } from "@shared/api/hooks/tasks/useUpdateTaskPositions";

interface Props {
  children: ReactNode;
  modeId: number;
  todayStr: string;
  dialogOpen?: boolean; // ✅ Add this
}

export default function TodayModeGroupDndWrapper({
  children,
  modeId,
  todayStr,
  dialogOpen,
}: Props) {
  const tasks = useTaskStore((s) => s.tasks);
  const reorderTasksInMode = useTaskStore((s) => s.reorderTasksInMode);
  const updateTaskPositionsLocally = useTaskStore(
    (s) => s.updateTaskPositionsLocally
  );
  const clearSelectedTasks = useTaskStore((s) => s.clearSelectedTasks);
  const selectedTaskIds = useTaskStore((s) => s.selectedTaskIds);
  const { mutate: updateTaskPositions } = useUpdateTaskPositions();

  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );
  const dialogOpenRef = useRef(dialogOpen);
  useEffect(() => {
    dialogOpenRef.current = dialogOpen;
  }, [dialogOpen]);

  const sortedTasks = tasks
    .filter((t) => t.modeId === modeId && t.dueDate === todayStr)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  function handleDragStart(event: DragStartEvent) {
    setActiveTaskId(Number(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTaskId(null);
    if (!active || !over || active.id === over.id) return;

    const isMultiDrag = selectedTaskIds.includes(Number(active.id));
    const movingIds = isMultiDrag ? selectedTaskIds : [Number(active.id)];

    const staticTasks = sortedTasks.filter((t) => !movingIds.includes(t.id));
    const movingTasks = sortedTasks.filter((t) => movingIds.includes(t.id));

    const activeIndex = sortedTasks.findIndex(
      (t) => t.id === Number(active.id)
    );
    const overIndexSorted = sortedTasks.findIndex(
      (t) => t.id === Number(over.id)
    );
    const overIndexStatic = staticTasks.findIndex(
      (t) => t.id === Number(over.id)
    );

    if (overIndexSorted === -1 || overIndexStatic === -1) return;

    const isMovingDown = overIndexSorted > activeIndex;
    const insertAt = isMovingDown ? overIndexStatic + 1 : overIndexStatic;

    const newOrder = [
      ...staticTasks.slice(0, insertAt),
      ...movingTasks,
      ...staticTasks.slice(insertAt),
    ];

    const updates = newOrder.map((t, index) => ({ id: t.id, position: index }));

    reorderTasksInMode(
      modeId,
      newOrder.map((t) => t.id)
    );
    updateTaskPositionsLocally(updates);
    updateTaskPositions(updates);
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const selected = useTaskStore.getState().selectedTaskIds;
      if (selected.length === 0) return;

      if (dialogOpenRef.current) return; // ✅ new guard

      const clickedInside = (e.target as HTMLElement).closest("[data-task-id]");
      if (clickedInside) {
        const taskId = Number(clickedInside.getAttribute("data-task-id"));
        if (selected.includes(taskId)) return;
      }

      clearSelectedTasks();
    }

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [clearSelectedTasks]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sortedTasks.map((t) => t.id)}
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
