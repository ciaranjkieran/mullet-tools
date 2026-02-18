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
import { format, startOfToday } from "date-fns";

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

// ✅ Updated hooks (use your new buildPatch-based versions)
import { useUpdateTask } from "@shared/api/hooks/tasks/useUpdateTask";
import { useUpdateMilestone } from "@shared/api/hooks/milestones/useUpdateMilestone";
import { useUpdateProject } from "@shared/api/hooks/projects/useUpdateProject";
import { useUpdateGoal } from "@shared/api/hooks/goals/useUpdateGoal";

type DueDatePatch = { id: number; dueDate: string | null };

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

function normalizeSliceDate(dateStr: DragMeta["dateStr"]): string {
  // In calendar view your meta.dateStr should be yyyy-MM-dd or null.
  // If null/undefined, treat it as "today" for overlay purposes.
  return typeof dateStr === "string" && dateStr.length > 0
    ? dateStr
    : format(startOfToday(), "yyyy-MM-dd");
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

  // ✅ Backend update hooks
  const { mutateAsync: updateTask } = useUpdateTask();
  const { mutateAsync: updateMilestone } = useUpdateMilestone();
  const { mutateAsync: updateProject } = useUpdateProject();
  const { mutateAsync: updateGoal } = useUpdateGoal();

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
      const payload: DueDatePatch = { id, dueDate: dateStr };

      if (entityType === "task") {
        await updateTask(payload);
        return;
      }
      if (entityType === "milestone") {
        await updateMilestone(payload);
        return;
      }
      if (entityType === "project") {
        await updateProject(payload);
        return;
      }
      if (entityType === "goal") {
        await updateGoal(payload);
        return;
      }
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
    routeCalendarDrop(e, {
      ensureListVisible,
      optimisticMoveToDate,
      persistDueDate,
    });
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

  // ✅ FIX: dragCount should be computed from the active item's own slice (mode + date),
  // not from "today" always.
  const dragCount = useMemo(() => {
    if (!activeMeta) return 0;

    const sliceDate = normalizeSliceDate(activeMeta.dateStr);
    const sliceModeId = activeMeta.modeId;

    if (activeMeta.entityType === "task") {
      const sliceIds = new Set(
        tasks
          .filter((t) => t.modeId === sliceModeId && t.dueDate === sliceDate)
          .map((t) => t.id)
      );
      const moving = new Set(selectedTaskIds.filter((id) => sliceIds.has(id)));
      moving.add(activeMeta.id);
      return moving.size;
    }

    if (activeMeta.entityType === "milestone") {
      const sliceIds = new Set(
        milestones
          .filter((m) => m.modeId === sliceModeId && m.dueDate === sliceDate)
          .map((m) => m.id)
      );
      const moving = new Set(
        selectedMilestoneIds.filter((id) => sliceIds.has(id))
      );
      moving.add(activeMeta.id);
      return moving.size;
    }

    if (activeMeta.entityType === "project") {
      const sliceIds = new Set(
        projects
          .filter((p) => p.modeId === sliceModeId && p.dueDate === sliceDate)
          .map((p) => p.id)
      );
      const moving = new Set(
        selectedProjectIds.filter((id) => sliceIds.has(id))
      );
      moving.add(activeMeta.id);
      return moving.size;
    }

    if (activeMeta.entityType === "goal") {
      const sliceIds = new Set(
        goals
          .filter((g) => g.modeId === sliceModeId && g.dueDate === sliceDate)
          .map((g) => g.id)
      );
      const moving = new Set(selectedGoalIds.filter((id) => sliceIds.has(id)));
      moving.add(activeMeta.id);
      return moving.size;
    }

    return 0;
  }, [
    activeMeta,
    tasks,
    milestones,
    projects,
    goals,
    selectedTaskIds,
    selectedMilestoneIds,
    selectedProjectIds,
    selectedGoalIds,
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
          <CalendarDragOverlay count={dragCount} noun={activeMeta.entityType} />
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
