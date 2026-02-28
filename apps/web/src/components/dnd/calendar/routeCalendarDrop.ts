// src/dnd/routeCalendarDrop.ts
"use client";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  parseDroppableId,
  type DragMeta,
  type TargetScope,
  type EntityType,
} from "./calendarDndIds";

import { useSelectionStore } from "@/lib/store/useSelectionStore";

// entity stores
import { useTaskStore } from "@shared/store/useTaskStore";
import { useMilestoneStore } from "@shared/store/useMilestoneStore";
import { useProjectStore } from "@shared/store/useProjectStore";
import { useGoalStore } from "@shared/store/useGoalStore";

type Deps = {
  ensureListVisible: (
    entityType: EntityType,
    modeId: number,
    dateStr: string
  ) => void;
  optimisticMoveToDate: (
    entityType: EntityType,
    id: number,
    dateStr: string
  ) => void;
  persistDueDate: (
    entityType: EntityType,
    id: number,
    dateStr: string
  ) => Promise<void>;
};

export async function routeCalendarDrop(e: DragEndEvent, deps: Deps) {
  const meta = e.active?.data?.current as DragMeta | undefined;
  const overId = e.over?.id as string | undefined;
  if (!meta || !overId) return;

  const target: TargetScope | null = parseDroppableId(overId);
  if (!target) return;

  // Never drop INTO Past Due
  if (target.dateStr === "past-due") return;

  // Always resolve to a DATE (even if we hovered a list/mode band)
  const destDate = target.dateStr;

  // ---- collect the IDs to move across ALL kinds ----
  const sel = useSelectionStore.getState().selected;

  // Always include the active item even if not explicitly selected.
  // Then union with current multi-select of each kind.
  const selectedTasks = new Set(sel.task);
  const selectedMilestones = new Set(sel.milestone);
  const selectedProjects = new Set(sel.project);
  const selectedGoals = new Set(sel.goal);

  if (meta.entityType === "task") selectedTasks.add(meta.id);
  if (meta.entityType === "milestone") selectedMilestones.add(meta.id);
  if (meta.entityType === "project") selectedProjects.add(meta.id);
  if (meta.entityType === "goal") selectedGoals.add(meta.id);

  // ---- load full items so we can skip already-on-date and group by mode ----
  const allTasks = useTaskStore.getState().tasks;
  const allMilestones = useMilestoneStore.getState().milestones;
  const allProjects = useProjectStore.getState().projects;
  const allGoals = useGoalStore.getState().goals;

  const tasksToMove = Array.from(selectedTasks)
    .map((id) => allTasks.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => !!t)
    .filter((t) => t.dueDate !== destDate);

  const milestonesToMove = Array.from(selectedMilestones)
    .map((id) => allMilestones.find((m) => m.id === id))
    .filter((m): m is NonNullable<typeof m> => !!m)
    .filter((m) => m.dueDate !== destDate);

  const projectsToMove = Array.from(selectedProjects)
    .map((id) => allProjects.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .filter((p) => p.dueDate !== destDate);

  const goalsToMove = Array.from(selectedGoals)
    .map((id) => allGoals.find((g) => g.id === id))
    .filter((g): g is NonNullable<typeof g> => !!g)
    .filter((g) => g.dueDate !== destDate);

  // If nothing actually changes, bail
  if (
    tasksToMove.length === 0 &&
    milestonesToMove.length === 0 &&
    projectsToMove.length === 0 &&
    goalsToMove.length === 0
  ) {
    return;
  }

  // ---- ensure the destination mode lists are visible (if you track UI state) ----
  const ensure = (type: EntityType, modeId: number) =>
    deps.ensureListVisible(type, modeId, destDate);

  new Set(tasksToMove.map((x) => x.modeId)).forEach((m) => ensure("task", m));
  new Set(milestonesToMove.map((x) => x.modeId)).forEach((m) =>
    ensure("milestone", m)
  );
  new Set(projectsToMove.map((x) => x.modeId)).forEach((m) =>
    ensure("project", m)
  );
  new Set(goalsToMove.map((x) => x.modeId)).forEach((m) => ensure("goal", m));

  // ---- optimistic update: each item keeps its OWN mode & type ----
  tasksToMove.forEach((t) => deps.optimisticMoveToDate("task", t.id, destDate));
  milestonesToMove.forEach((m) =>
    deps.optimisticMoveToDate("milestone", m.id, destDate)
  );
  projectsToMove.forEach((p) =>
    deps.optimisticMoveToDate("project", p.id, destDate)
  );
  goalsToMove.forEach((g) => deps.optimisticMoveToDate("goal", g.id, destDate));

  // ---- persist sequentially to avoid SQLite "database is locked" errors ----
  const allMoves: Array<{ type: EntityType; id: number }> = [
    ...tasksToMove.map((t) => ({ type: "task" as const, id: t.id })),
    ...milestonesToMove.map((m) => ({ type: "milestone" as const, id: m.id })),
    ...projectsToMove.map((p) => ({ type: "project" as const, id: p.id })),
    ...goalsToMove.map((g) => ({ type: "goal" as const, id: g.id })),
  ];
  for (const item of allMoves) {
    await deps.persistDueDate(item.type, item.id, destDate);
  }
}
