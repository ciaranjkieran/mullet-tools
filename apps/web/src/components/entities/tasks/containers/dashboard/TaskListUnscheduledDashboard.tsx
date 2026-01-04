"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useReorderTasksHome } from "@shared/api/hooks/tasks/useReorderTasksHome";

import { Mode } from "@shared/types/Mode";
import { Task } from "@shared/types/Task";
import { useTaskStore } from "@shared/store/useTaskStore";
import { useSelectionStore } from "@/lib/store/useSelectionStore";
import TaskCardDragDashboard from "../../dnd/dashboard/TaskCardDragDashboard";
import TaskRendererDashboard from "../../renderers/dashboard/TaskRendererDashboard";

type Props = {
  mode: Mode;
  modes: Mode[];
  tasks: Task[];
  onEditTask?: (task: Task) => void;
};

const ids = (arr: Task[]) => arr.map((t) => t.id);

export default function TaskListUnscheduledDashboard({ mode, tasks }: Props) {
  // Source: unscheduled tasks (from props)
  const unscheduled = useMemo(() => tasks.filter((t) => !t.dueDate), [tasks]);

  // Local optimistic list
  const [localTasks, setLocalTasks] = useState<Task[]>(unscheduled);

  // ---- Selection (stable subscription; no selector allocations) ----
  const selectedTaskSet = useSelectionStore((s) => s.selected.task);
  const selectedTaskIds = useMemo(
    () => Array.from(selectedTaskSet ?? new Set<number>()),
    [selectedTaskSet]
  );
  const isSelected = useSelectionStore((s) => s.isSelected);

  // ---- Prop-sync lock to prevent hop ----
  const syncLockedRef = useRef(false);
  const pendingIdsRef = useRef<number[] | null>(null);
  const unlockTimeoutRef = useRef<number | null>(null);

  // ---- Overlay state ----
  const movingIdsRef = useRef<number[]>([]);
  const [dragCount, setDragCount] = useState(0);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  useEffect(() => {
    const incoming = unscheduled;

    // While a reorder is in flight, only unlock when IDs match the expected order
    if (syncLockedRef.current && pendingIdsRef.current) {
      const matches =
        pendingIdsRef.current.length === incoming.length &&
        pendingIdsRef.current.every((id, i) => id === incoming[i].id);

      if (matches) {
        setLocalTasks(incoming);
        pendingIdsRef.current = null;
        syncLockedRef.current = false;
        if (unlockTimeoutRef.current) {
          window.clearTimeout(unlockTimeoutRef.current);
          unlockTimeoutRef.current = null;
        }
      }
      return;
    }

    // ✅ Not drag-locked: always sync local tasks to latest store props
    setLocalTasks(incoming);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unscheduled]);

  // ---- Store/server updates ----
  const updateTaskPositionsLocally = useTaskStore(
    (s) => s.updateTaskPositionsLocally
  );
  const reorderHome = useReorderTasksHome();

  // ---- Sensors ----
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragStart(e: DragStartEvent) {
    syncLockedRef.current = true;

    const activeId = Number(e.active.id);
    const moveMany = isSelected("task", activeId);
    const movingIds = moveMany ? selectedTaskIds : [activeId];

    movingIdsRef.current = movingIds;
    setDragCount(movingIds.length);

    // For single drag, set the active task so we can render a cloned overlay card
    if (movingIds.length === 1) {
      const t = localTasks.find((x) => x.id === activeId) ?? null;
      setActiveTask(t);
    } else {
      setActiveTask(null);
    }
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;

    if (!over || active.id === over.id) {
      // No-op drop: unlock next frame
      requestAnimationFrame(() => (syncLockedRef.current = false));
      movingIdsRef.current = [];
      setDragCount(0);
      setActiveTask(null);
      return;
    }

    const movingIds = movingIdsRef.current.length
      ? movingIdsRef.current
      : [Number(active.id)];

    // Split into static + moving blocks
    const staticTasks = localTasks.filter((t) => !movingIds.includes(t.id));
    const movingTasks = localTasks.filter((t) => movingIds.includes(t.id));

    // Insert position in STATIC list
    const activeIndexInLocal = localTasks.findIndex((t) => t.id === active.id);
    const overIndexInLocal = localTasks.findIndex((t) => t.id === over.id);
    const isMovingDown = overIndexInLocal > activeIndexInLocal;

    const insertAt = staticTasks.findIndex((t) => t.id === over.id);
    const targetIndex =
      insertAt < 0 ? staticTasks.length : insertAt + (isMovingDown ? 1 : 0);

    // New order
    const newOrder = [
      ...staticTasks.slice(0, targetIndex),
      ...movingTasks,
      ...staticTasks.slice(targetIndex),
    ];

    // Optimistic local reorder
    setLocalTasks(newOrder);

    // Wait for props to match this order before unlocking
    pendingIdsRef.current = ids(newOrder);

    // Safety unlock if echo never arrives
    if (unlockTimeoutRef.current) window.clearTimeout(unlockTimeoutRef.current);
    unlockTimeoutRef.current = window.setTimeout(() => {
      pendingIdsRef.current = null;
      syncLockedRef.current = false;
      unlockTimeoutRef.current = null;
    }, 800);

    // Build updates
    const updates = newOrder.map((t, idx) => ({ id: t.id, position: idx }));

    // Determine container (lowest-tier)
    const sample = newOrder[0];
    const container = sample.milestoneId
      ? ({ kind: "milestone", id: sample.milestoneId } as const)
      : sample.projectId
      ? ({ kind: "project", id: sample.projectId } as const)
      : sample.goalId
      ? ({ kind: "goal", id: sample.goalId } as const)
      : ({ kind: "mode", id: sample.modeId } as const);

    // Echo to store + server
    updateTaskPositionsLocally(updates);
    reorderHome.mutate({
      modeId: sample.modeId,
      container,
      changes: updates,
    });

    // Clear overlay state
    movingIdsRef.current = [];
    setDragCount(0);
    setActiveTask(null);
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (unlockTimeoutRef.current)
        window.clearTimeout(unlockTimeoutRef.current);
    };
  }, []);

  if (!localTasks.length) return null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={localTasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="mt-4 grid grid-cols-1 gap-4">
          {localTasks.map((task) => (
            <TaskCardDragDashboard key={task.id} task={task} modes={[mode]} />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {dragCount > 1 ? (
          // Multi-drag: compact count bubble
          <div className="bg-white shadow-md px-3 py-2 rounded border text-sm font-semibold">
            {dragCount} tasks
          </div>
        ) : activeTask ? (
          // Single-drag: render a cloned card (the original is opacity: 0 → leaves gap)
          <div className="pointer-events-none">
            <TaskRendererDashboard task={activeTask} mode={mode} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
