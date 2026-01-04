"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  DndContext,
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
} from "@dnd-kit/sortable";
import {
  restrictToVerticalAxis,
  restrictToFirstScrollableAncestor,
} from "@dnd-kit/modifiers";

import { Mode } from "@shared/types/Mode";
import { Task } from "@shared/types/Task";
import { Milestone } from "@shared/types/Milestone";
import { Project } from "@shared/types/Project";
import { Goal } from "@shared/types/Goal";

import { useReorderGoalsHome } from "@shared/api/hooks/goals/useReorderGoalsHome";
import { useGoalStore } from "@shared/store/useGoalStore";

import SortableWithHandle from "@/components/common/SortableWithHandle";
import { gid, parseGid } from "../../dnd/dashboard/dndIdsGoals";
import GoalItem from "./GoalItem";
import GoalRenderer from "../../renderers/dashboard/GoalRendererDashboard";

import { useEntityUIStore } from "@/lib/store/useEntityUIStore";
import { useSelectionStore } from "@/lib/store/useSelectionStore";

type Props = {
  goals: Goal[];
  depth: number;
  mode: Mode;
  modes: Mode[];
  tasks: Task[];
  milestones: Milestone[];
  projects: Project[];
};

export default function GoalListUnscheduledDnd({
  goals,
  depth,
  mode,
  modes,
  tasks,
  milestones,
  projects,
}: Props) {
  // Visible ids for this container (string-coded with gid)
  const ids = useMemo(() => goals.map((g) => gid(g.id)), [goals]);

  // Collapse helpers — align with project behavior: only draggable when collapsed
  const collapseMany = useEntityUIStore((s) => s.collapseMany);
  const setCollapsed = useEntityUIStore((s) => s.setCollapsed);
  const collapsedMap = useEntityUIStore((s) => s.collapsed.goal);
  const isCollapsed = (id: number) => !!collapsedMap?.[id];

  // Local reorder + server mutation
  // (Preserves your existing local update util + bulk endpoint)
  const updateLocal = useGoalStore((s) => s.updateGoalPositionsLocally);
  const reorderMutation = useReorderGoalsHome();

  // Selection (multi-drag)
  const selectedSet = useSelectionStore((s) => s.selected.goal);
  const isSelected = useSelectionStore((s) => s.isSelected);

  // Overlay state
  const movingIdsRef = useRef<number[]>([]);
  const [dragCount, setDragCount] = useState(0);
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null);

  // Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const idsInScopeNums = useMemo(() => goals.map((g) => g.id), [goals]);

  const onDragStart = (e: DragStartEvent) => {
    const active = e.active?.id;
    if (!active) return;

    const activeId = parseGid(String(active));

    // Build moving group: selected ∩ this container OR just active
    const selected = selectedSet ? Array.from(selectedSet) : [];
    const selectedInThisContainer = selected.filter((id) =>
      idsInScopeNums.includes(id)
    );

    const moving =
      isSelected("goal", activeId) && selectedInThisContainer.length > 1
        ? selectedInThisContainer
        : [activeId];

    movingIdsRef.current = moving;
    setDragCount(moving.length);

    if (moving.length === 1) {
      const g = goals.find((x) => x.id === activeId) ?? null;
      setActiveGoal(g);
    } else {
      setActiveGoal(null);
    }

    // Collapse siblings visually (project parity): collapse all, ensure active collapsed
    collapseMany("goal", idsInScopeNums);
    setCollapsed("goal", activeId, true);
  };

  // Find the nearest non-moving "over" id in the direction of travel if needed
  function resolveStaticOverId(
    overIdStr: string,
    allIdsStr: string[],
    movingStr: Set<string>,
    movedDown: boolean
  ): string | null {
    if (!movingStr.has(overIdStr)) return overIdStr;

    const startIdx = allIdsStr.indexOf(overIdStr);
    if (startIdx < 0) return null;

    if (movedDown) {
      for (let i = startIdx + 1; i < allIdsStr.length; i++) {
        if (!movingStr.has(allIdsStr[i])) return allIdsStr[i];
      }
    } else {
      for (let i = startIdx - 1; i >= 0; i--) {
        if (!movingStr.has(allIdsStr[i])) return allIdsStr[i];
      }
    }
    // Fallback: no static neighbor found
    return null;
  }

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;

    setActiveGoal(null);

    if (!over || active.id === over.id) {
      movingIdsRef.current = [];
      setDragCount(0);
      return;
    }

    const allIdsStr = ids; // current visible order (strings)
    const movingNums = movingIdsRef.current.length
      ? movingIdsRef.current
      : [parseGid(String(active.id))];
    const movingStrSet = new Set(movingNums.map((n) => gid(n)));

    // Direction from anchor indices
    const activeIdx = allIdsStr.indexOf(String(active.id));
    const overIdx = allIdsStr.indexOf(String(over.id));
    const movedDown = overIdx > activeIdx;

    // Build static + moving lists
    const staticStr = allIdsStr.filter((idStr) => !movingStrSet.has(idStr));
    const movingStr = allIdsStr.filter((idStr) => movingStrSet.has(idStr));

    // Ensure drop target is static
    let targetOverStr = resolveStaticOverId(
      String(over.id),
      allIdsStr,
      movingStrSet,
      movedDown
    );

    // Insert index in STATIC list
    let insertAt = targetOverStr ? staticStr.indexOf(targetOverStr) : -1;
    if (insertAt < 0) insertAt = movedDown ? staticStr.length : 0;

    const targetIndex = insertAt + (movedDown ? 1 : 0);

    // New order (strings)
    const newOrderStr = [
      ...staticStr.slice(0, targetIndex),
      ...movingStr,
      ...staticStr.slice(targetIndex),
    ];

    const newOrderNums = newOrderStr.map((s) => parseGid(s));

    // 1) Local optimistic update
    // (Preserve your contiguous position approach)
    updateLocal(newOrderNums.map((id, position) => ({ id, position })));

    // 2) Server persist (bulk) — goals live at mode scope
    reorderMutation.mutate({
      modeId: mode.id,
      container: { kind: "mode", id: mode.id } as const,
      changes: newOrderNums.map((id, position) => ({ id, position })),
    });

    movingIdsRef.current = [];
    setDragCount(0);
  };

  if (!goals.length) return null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      modifiers={[restrictToVerticalAxis, restrictToFirstScrollableAncestor]}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {goals.map((g) => (
            <SortableWithHandle
              key={g.id}
              id={gid(g.id)}
              // Disable sortable when *not* collapsed (match project UX)
              disabled={!isCollapsed(g.id)}
            >
              {({ handleProps }) => (
                <GoalItem
                  goal={g}
                  depth={depth}
                  mode={mode}
                  modes={modes}
                  tasks={tasks}
                  milestones={milestones}
                  projects={projects}
                  // Only pass DnD listeners/attrs when collapsed (draggable)
                  dragHandleProps={
                    isCollapsed(g.id) ? (handleProps as any) : undefined
                  }
                />
              )}
            </SortableWithHandle>
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {dragCount > 1 ? (
          <div className="bg-white shadow-md px-3 py-2 rounded-md border border-gray-200 text-sm font-semibold">
            {dragCount} goals
          </div>
        ) : activeGoal ? (
          <div
            className={`
              pointer-events-none
              rounded-md
              border border-gray-200
              dark:border-white/10
              bg-white shadow-sm
            `}
          >
            <GoalRenderer
              goal={activeGoal}
              mode={mode}
              collapsed
              modeColor={
                modes.find((m) => m.id === activeGoal.modeId)?.color ?? "#000"
              }
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
