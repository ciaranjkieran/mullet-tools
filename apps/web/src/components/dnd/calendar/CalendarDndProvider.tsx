// src/components/dnd/calendar/CalendarDndProvider.tsx
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

  // ✅ Backend update hooks (clean usage)
  const { mutateAsync: updateTask } = useUpdateTask();
  const { mutateAsync: updateMilestone } = useUpdateMilestone();
  const { mutateAsync: updateProject } = useUpdateProject();
  const { mutateAsync: updateGoal } = useUpdateGoal();

  // Cache patch helper (optimistic)
  const patchDateInCache =
    (_key: string[]) => (id: number, dateStr: string | null) => (old: any) => {
      if (!old) return old;
      if (Array.isArray(old)) {
        return old.map((it: any) =>
          it.id === id ? { ...it, dueDate: dateStr } : it
        );
      }
      if (old?.results && Array.isArray(old.results)) {
        return {
          ...old,
          results: old.results.map((it: any) =>
            it.id === id ? { ...it, dueDate: dateStr } : it
          ),
        };
      }
      return old;
    };

  // Optional: expand target list on drop
  const ensureListVisible = (
    _entityType: EntityType,
    _modeId: number,
    _dateStr: string
  ) => {};

  // Optimistic move-to-date
  const optimisticMoveToDate = (
    entityType: EntityType,
    id: number,
    dateStr: string
  ) => {
    if (entityType === "task") {
      useTaskStore.getState().updateTaskDate(id, dateStr);
      queryClient.setQueryData(
        ["tasks"],
        patchDateInCache(["tasks"])(id, dateStr)
      );
      return;
    }
    if (entityType === "milestone") {
      useMilestoneStore.getState().moveMilestoneToDate(id, dateStr);
      queryClient.setQueryData(
        ["milestones"],
        patchDateInCache(["milestones"])(id, dateStr)
      );
      return;
    }
    if (entityType === "project") {
      useProjectStore.getState().moveProjectToDate(id, dateStr);
      queryClient.setQueryData(
        ["projects"],
        patchDateInCache(["projects"])(id, dateStr)
      );
      return;
    }
    if (entityType === "goal") {
      useGoalStore.getState().moveGoalToDate(id, dateStr);
      queryClient.setQueryData(
        ["goals"],
        patchDateInCache(["goals"])(id, dateStr)
      );
      return;
    }
  };

  // ✅ Persist move-to-date using the hooks (with snake_case fallback)
  const persistDueDate = async (
    entityType: EntityType,
    id: number,
    dateStr: string
  ) => {
    try {
      if (entityType === "task") {
        await updateTask({ id, dueDate: dateStr });
        return;
      }
      if (entityType === "milestone") {
        await updateMilestone({ id, dueDate: dateStr } as any);
        return;
      }
      if (entityType === "project") {
        await updateProject({ id, dueDate: dateStr } as any);
        return;
      }
      if (entityType === "goal") {
        await updateGoal({ id, dueDate: dateStr } as any);
        return;
      }
    } catch (err) {
      console.error("[persistDueDate] update failed", {
        entityType,
        id,
        dateStr,
        err,
      });

      // Optional fallback if a hook fails (ensure snake_case)
      const snakeBody = JSON.stringify({ due_date: dateStr });
      const base = "http://127.0.0.1:8000/api";

      try {
        if (entityType === "task") {
          await fetch(`${base}/tasks/${id}/`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: snakeBody,
          });
          queryClient.invalidateQueries({ queryKey: ["tasks"] });
        } else if (entityType === "milestone") {
          await fetch(`${base}/milestones/${id}/`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: snakeBody,
          });
          queryClient.invalidateQueries({ queryKey: ["milestones"] });
        } else if (entityType === "project") {
          await fetch(`${base}/projects/${id}/`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: snakeBody,
          });
          queryClient.invalidateQueries({ queryKey: ["projects"] });
        } else if (entityType === "goal") {
          await fetch(`${base}/goals/${id}/`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: snakeBody,
          });
          queryClient.invalidateQueries({ queryKey: ["goals"] });
        }
      } catch (fallbackErr) {
        console.error("[persistDueDate] fallback fetch failed", {
          entityType,
          id,
          dateStr,
          fallbackErr,
        });
      }
    }
  };

  // ─────────── TODAY reordering (cross-parent, multi-select aware) for all kinds

  // Handlers
  const onDragStart = (e: DragStartEvent) => {
    const meta = e.active?.data?.current as DragMeta | undefined;
    setActiveMeta(meta || null);
  };

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveMeta(null);

    const active = e.active?.data?.current as DragMeta | undefined;
    const over = e.over?.data?.current as DragMeta | undefined;

    // 2) Otherwise: band/date drop (multi-select move handled in routeCalendarDrop)
    routeCalendarDrop(e, {
      ensureListVisible,
      optimisticMoveToDate,
      persistDueDate,
    });
  };

  // ─────────── Overlay (Home-style)
  const tasks = useTaskStore((s) => s.tasks);
  const milestones = useMilestoneStore((s) => s.milestones);
  const projects = useProjectStore((s) => s.projects);
  const goals = useGoalStore((s) => s.goals);

  const selectedTaskIds = useMemo(
    () => Array.from(useSelectionStore.getState().selected.task),
    [useSelectionStore((s) => s.selected.task)]
  );
  const selectedMilestoneIds = useMemo(
    () => Array.from(useSelectionStore.getState().selected.milestone),
    [useSelectionStore((s) => s.selected.milestone)]
  );
  const selectedProjectIds = useMemo(
    () => Array.from(useSelectionStore.getState().selected.project),
    [useSelectionStore((s) => s.selected.project)]
  );
  const selectedGoalIds = useMemo(
    () => Array.from(useSelectionStore.getState().selected.goal),
    [useSelectionStore((s) => s.selected.goal)]
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

  const dragCount = useMemo(() => {
    if (!activeMeta) return 0;
    const todayStr = format(startOfToday(), "yyyy-MM-dd");

    if (activeMeta.entityType === "task") {
      const sliceIds = new Set(
        tasks
          .filter(
            (t) => t.modeId === activeMeta.modeId && t.dueDate === todayStr
          )
          .map((t) => t.id)
      );
      const moving = new Set(selectedTaskIds.filter((id) => sliceIds.has(id)));
      moving.add(activeMeta.id);
      return moving.size;
    }
    if (activeMeta.entityType === "milestone") {
      const sliceIds = new Set(
        milestones
          .filter(
            (m) => m.modeId === activeMeta.modeId && m.dueDate === todayStr
          )
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
          .filter(
            (p) => p.modeId === activeMeta.modeId && p.dueDate === todayStr
          )
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
          .filter(
            (g) => g.modeId === activeMeta.modeId && g.dueDate === todayStr
          )
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
        {activeMeta?.entityType === "task" ? (
          dragCount > 1 ? (
            <div className="bg-white shadow-md px-3 py-2 rounded border text-sm font-semibold">
              {dragCount} {dragCount === 1 ? "task" : "tasks"}
            </div>
          ) : activeTask ? (
            <div className="pointer-events-none">
              <TaskRendererCalendar
                task={activeTask}
                mode={overlayMode}
                showModeTitle={false}
              />
            </div>
          ) : null
        ) : activeMeta?.entityType === "milestone" ? (
          dragCount > 1 ? (
            <div className="bg-white shadow-md px-3 py-2 rounded border text-sm font-semibold">
              {dragCount} {dragCount === 1 ? "milestone" : "milestones"}
            </div>
          ) : activeMilestone ? (
            <div className="pointer-events-none">
              <MilestoneRendererCalendar
                milestone={activeMilestone}
                mode={overlayMode}
                showModeTitle={false}
              />
            </div>
          ) : null
        ) : activeMeta?.entityType === "project" ? (
          dragCount > 1 ? (
            <div className="bg-white shadow-md px-3 py-2 rounded border text-sm font-semibold">
              {dragCount} {dragCount === 1 ? "project" : "projects"}
            </div>
          ) : activeProject ? (
            <div className="pointer-events-none">
              <ProjectRendererCalendar
                project={activeProject}
                mode={overlayMode}
                showModeTitle={false}
              />
            </div>
          ) : null
        ) : activeMeta?.entityType === "goal" ? (
          dragCount > 1 ? (
            <div className="bg-white shadow-md px-3 py-2 rounded border text-sm font-semibold">
              {dragCount} {dragCount === 1 ? "goal" : "goals"}
            </div>
          ) : activeGoal ? (
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
