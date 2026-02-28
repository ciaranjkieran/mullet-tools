"use client";

import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverlay,
  closestCenter,
  pointerWithin,
  rectIntersection,
  MeasuringStrategy,
} from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import type { Mode } from "@shared/types/Mode";
import type { DragMeta, EntityType } from "./calendarDndIds";
import { routeCalendarDrop } from "./routeCalendarDrop";

// Renderers for overlay clones
import TaskRendererCalendar from "@/components/entities/tasks/renderers/calendar/TaskRendererCalendar";
import MilestoneRendererCalendar from "@/components/entities/milestones/renderers/calendar/MilestoneRendererCalendar";
import ProjectRendererCalendar from "@/components/entities/projects/renderers/calendar/ProjectRendererCalendar";
import GoalRendererCalendar from "@/components/entities/goals/renderers/calendar/GoalRendererCalendar";

import CalendarDragOverlay from "./CalendarDragOverlay";

// Stores
import { useTaskStore } from "@shared/store/useTaskStore";
import { useMilestoneStore } from "@shared/store/useMilestoneStore";
import { useProjectStore } from "@shared/store/useProjectStore";
import { useGoalStore } from "@shared/store/useGoalStore";
import { useSelectionStore } from "@/lib/store/useSelectionStore";

// Direct API for batch persistence (avoids per-item query invalidation race)
import api from "@shared/api/axios";
import { ensureCsrf } from "@shared/api/hooks/auth/ensureCsrf";

type WithIdAndDueDate = { id: number; dueDate?: string | null };
type Paginated<T> = { results: T[] };

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}
function hasResultsArray(x: unknown): x is Paginated<unknown> {
  return isRecord(x) && Array.isArray((x as Record<string, unknown>).results);
}
function isWithIdAndDueDate(x: unknown): x is WithIdAndDueDate {
  return isRecord(x) && typeof (x as Record<string, unknown>).id === "number";
}

export default function CalendarDndProvider({
  children,
  modeMap,
}: {
  children: React.ReactNode;
  modeMap?: Record<number, Mode>;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const hybridCollision: Parameters<
    typeof DndContext
  >[0]["collisionDetection"] = (args) => {
    const byPointer = pointerWithin(args);
    if (byPointer.length) return byPointer;

    const byRect = rectIntersection(args);
    if (byRect.length) return byRect;

    return closestCenter(args);
  };

  const [activeMeta, setActiveMeta] = useState<DragMeta | null>(null);
  const isDragging = !!activeMeta;
  const queryClient = useQueryClient();

  // Visual cursor class
  useEffect(() => {
    const el =
      document.getElementById("calendar-view-root") || document.documentElement;
    if (isDragging) el.classList.add("cal-dragging");
    else el.classList.remove("cal-dragging");
    return () => el.classList.remove("cal-dragging");
  }, [isDragging]);

  // No mutation hooks here — persistDueDate uses raw API calls to avoid
  // per-item query invalidation that causes a race condition during batch moves.

  // Cache patch helper (optimistic)
  const patchDateInCache =
    (id: number, dateStr: string | null) =>
    (old: unknown): unknown => {
      if (!old) return old;

      if (Array.isArray(old)) {
        return old.map((it) => {
          if (isWithIdAndDueDate(it) && it.id === id) {
            return { ...it, dueDate: dateStr };
          }
          return it;
        });
      }

      if (hasResultsArray(old)) {
        const results = old.results.map((it) => {
          if (isWithIdAndDueDate(it) && it.id === id) {
            return { ...it, dueDate: dateStr };
          }
          return it;
        });
        return { ...(old as Record<string, unknown>), results };
      }

      return old;
    };

  const ensureListVisible = (
    entityType: EntityType,
    modeId: number,
    dateStr: string
  ) => {
    void entityType;
    void modeId;
    void dateStr;
  };

  const optimisticMoveToDate = (
    entityType: EntityType,
    id: number,
    dateStr: string
  ) => {
    if (entityType === "task") {
      useTaskStore.getState().updateTaskDate(id, dateStr);
      queryClient.setQueryData(["tasks"], patchDateInCache(id, dateStr));
      return;
    }
    if (entityType === "milestone") {
      useMilestoneStore.getState().moveMilestoneToDate(id, dateStr);
      queryClient.setQueryData(["milestones"], patchDateInCache(id, dateStr));
      return;
    }
    if (entityType === "project") {
      useProjectStore.getState().moveProjectToDate(id, dateStr);
      queryClient.setQueryData(["projects"], patchDateInCache(id, dateStr));
      return;
    }
    if (entityType === "goal") {
      useGoalStore.getState().moveGoalToDate(id, dateStr);
      queryClient.setQueryData(["goals"], patchDateInCache(id, dateStr));
      return;
    }
  };

  const persistDueDate = async (
    entityType: EntityType,
    id: number,
    dateStr: string
  ) => {
    try {
      await ensureCsrf();
      const body = { dueDate: dateStr };

      if (entityType === "task") await api.patch(`/tasks/${id}/`, body);
      else if (entityType === "milestone") await api.patch(`/milestones/${id}/`, body);
      else if (entityType === "project") await api.patch(`/projects/${id}/`, body);
      else if (entityType === "goal") await api.patch(`/goals/${id}/`, body);
    } catch (err) {
      console.error("[persistDueDate] update failed", {
        entityType,
        id,
        dateStr,
        err,
      });
    }
  };

  const onDragStart = (e: DragStartEvent) => {
    const meta = e.active?.data?.current as DragMeta | undefined;
    setActiveMeta(meta || null);
  };

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveMeta(null);
    await routeCalendarDrop(e, {
      ensureListVisible,
      optimisticMoveToDate,
      persistDueDate,
    });
    // Single invalidation after ALL items are persisted — avoids the race
    // where an early refetch returns stale dates for not-yet-saved items.
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: ["milestones"] });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    queryClient.invalidateQueries({ queryKey: ["goals"] });
  };

  // ─────────── Overlay backing data
  const tasks = useTaskStore((s) => s.tasks);
  const milestones = useMilestoneStore((s) => s.milestones);
  const projects = useProjectStore((s) => s.projects);
  const goals = useGoalStore((s) => s.goals);

  const selectedTaskSet = useSelectionStore((s) => s.selected.task);
  const selectedMilestoneSet = useSelectionStore((s) => s.selected.milestone);
  const selectedProjectSet = useSelectionStore((s) => s.selected.project);
  const selectedGoalSet = useSelectionStore((s) => s.selected.goal);

  const selectedTaskIds = useMemo(
    () => Array.from(selectedTaskSet),
    [selectedTaskSet]
  );
  const selectedMilestoneIds = useMemo(
    () => Array.from(selectedMilestoneSet),
    [selectedMilestoneSet]
  );
  const selectedProjectIds = useMemo(
    () => Array.from(selectedProjectSet),
    [selectedProjectSet]
  );
  const selectedGoalIds = useMemo(
    () => Array.from(selectedGoalSet),
    [selectedGoalSet]
  );

  const activeTask = useMemo(() => {
    if (!activeMeta || activeMeta.entityType !== "task") return null;
    return tasks.find((t) => t.id === activeMeta.id) ?? null;
  }, [activeMeta, tasks]);

  const activeMilestone = useMemo(() => {
    if (!activeMeta || activeMeta.entityType !== "milestone") return null;
    return milestones.find((m) => m.id === activeMeta.id) ?? null;
  }, [activeMeta, milestones]);

  const activeProject = useMemo(() => {
    if (!activeMeta || activeMeta.entityType !== "project") return null;
    return projects.find((p) => p.id === activeMeta.id) ?? null;
  }, [activeMeta, projects]);

  const activeGoal = useMemo(() => {
    if (!activeMeta || activeMeta.entityType !== "goal") return null;
    return goals.find((g) => g.id === activeMeta.id) ?? null;
  }, [activeMeta, goals]);

  // Count all selected items (across every entity type) + the dragged item.
  // This matches what routeCalendarDrop actually moves.
  const { dragCount, dragNoun } = useMemo(() => {
    if (!activeMeta) return { dragCount: 0, dragNoun: "item" };

    const counts = {
      task: selectedTaskIds.length,
      milestone: selectedMilestoneIds.length,
      project: selectedProjectIds.length,
      goal: selectedGoalIds.length,
    };

    // Include the dragged item if it wasn't already selected
    const { entityType, id } = activeMeta;
    const alreadySelected =
      (entityType === "task" && selectedTaskSet.has(id)) ||
      (entityType === "milestone" && selectedMilestoneSet.has(id)) ||
      (entityType === "project" && selectedProjectSet.has(id)) ||
      (entityType === "goal" && selectedGoalSet.has(id));

    if (!alreadySelected) counts[entityType]++;

    const total = counts.task + counts.milestone + counts.project + counts.goal;
    const typesWithItems = Object.values(counts).filter((c) => c > 0).length;
    const noun = typesWithItems > 1 ? "item" : activeMeta.entityType;

    return { dragCount: Math.max(total, 1), dragNoun: noun };
  }, [
    activeMeta,
    selectedTaskIds,
    selectedMilestoneIds,
    selectedProjectIds,
    selectedGoalIds,
    selectedTaskSet,
    selectedMilestoneSet,
    selectedProjectSet,
    selectedGoalSet,
  ]);

  const overlayMode =
    activeMeta?.entityType === "task" && activeTask
      ? modeMap?.[activeTask.modeId]
      : activeMeta?.entityType === "milestone" && activeMilestone
      ? modeMap?.[activeMilestone.modeId]
      : activeMeta?.entityType === "project" && activeProject
      ? modeMap?.[activeProject.modeId]
      : activeMeta?.entityType === "goal" && activeGoal
      ? modeMap?.[activeGoal.modeId]
      : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={hybridCollision}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveMeta(null)}
    >
      {children}

      <DragOverlay
        dropAnimation={{ duration: 150, easing: "cubic-bezier(0.2, 0, 0, 1)" }}
      >
        {!activeMeta ? null : dragCount > 1 ? (
          <CalendarDragOverlay count={dragCount} noun={dragNoun} />
        ) : activeMeta.entityType === "task" ? (
          activeTask ? (
            <div className="pointer-events-none">
              <TaskRendererCalendar
                task={activeTask}
                mode={overlayMode}
                showModeTitle={false}
              />
            </div>
          ) : null
        ) : activeMeta.entityType === "milestone" ? (
          activeMilestone ? (
            <div className="pointer-events-none">
              <MilestoneRendererCalendar
                milestone={activeMilestone}
                mode={overlayMode}
                showModeTitle={false}
              />
            </div>
          ) : null
        ) : activeMeta.entityType === "project" ? (
          activeProject ? (
            <div className="pointer-events-none">
              <ProjectRendererCalendar
                project={activeProject}
                mode={overlayMode}
                showModeTitle={false}
              />
            </div>
          ) : null
        ) : activeMeta.entityType === "goal" ? (
          activeGoal ? (
            <div className="pointer-events-none">
              <GoalRendererCalendar
                goal={activeGoal}
                mode={overlayMode}
                showModeTitle={false}
              />
            </div>
          ) : null
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
