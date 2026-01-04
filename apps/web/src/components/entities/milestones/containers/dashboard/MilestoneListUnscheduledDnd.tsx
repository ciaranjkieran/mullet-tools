// components/entities/milestones/lists/MilestoneListUnscheduledDnd.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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

import { NestedMilestone } from "../../utils/MilestoneTreeBuilder";
import { Mode } from "@shared/types/Mode";
import { Task } from "@shared/types/Task";

import { useReorderMilestonesHome } from "@shared/api/hooks/milestones/useReorderMilestonesHome";
import { useMilestoneStore } from "@shared/store/useMilestoneStore";

import { mid, parseMid } from "../../dnd/dashboard/dndIds";
import SortableWithHandle from "../../../../common/SortableWithHandle";
import MilestoneItem from "./MilestoneItem";
import MilestoneRenderer from "../../renderers/dashboard/MilestoneRendererDashboard";

import { useEntityUIStore } from "@/lib/store/useEntityUIStore";
import { useSelectionStore } from "@/lib/store/useSelectionStore";
import type { Container } from "./MilestoneList";

type Props = {
  parentId: number | null;
  milestones: NestedMilestone[];
  depth: number;
  mode: Mode;
  modes: Mode[];
  tasks: Task[];
  container?: Container;
};

export default function MilestoneUnscheduledDnd({
  parentId,
  milestones,
  depth,
  mode,
  modes,
  tasks,
  container,
}: Props) {
  // 1) Normalise / guard milestones
  const safeMilestones = useMemo(
    () =>
      (milestones ?? []).filter(
        (m): m is NestedMilestone => !!m && typeof m.id === "number"
      ),
    [milestones]
  );

  // 2) Local ordering state (to keep UI in sync with dnd-kit)
  const [orderedIds, setOrderedIds] = useState<number[]>(() =>
    safeMilestones.map((m) => m.id)
  );

  // Whenever the set of milestones changes (new/removed), sync order
  useEffect(() => {
    const incomingIds = safeMilestones.map((m) => m.id);

    setOrderedIds((prev) => {
      // If same ids, keep the existing order (user's last drag)
      const sameLength = prev.length === incomingIds.length;
      const sameSet =
        sameLength &&
        prev.every((id) => incomingIds.includes(id)) &&
        incomingIds.every((id) => prev.includes(id));

      if (sameSet) return prev;
      return incomingIds;
    });
  }, [safeMilestones]);

  // 3) Apply local ordering to the milestones for rendering
  const orderedMilestones = useMemo(() => {
    const orderIndex = new Map<number, number>();
    orderedIds.forEach((id, idx) => orderIndex.set(id, idx));

    return [...safeMilestones].sort((a, b) => {
      const ia = orderIndex.get(a.id) ?? 0;
      const ib = orderIndex.get(b.id) ?? 0;
      return ia - ib;
    });
  }, [safeMilestones, orderedIds]);

  // 4) Visible ids in this container (string-coded with mid)
  const ids = useMemo(
    () => orderedMilestones.map((m) => mid(m.id)),
    [orderedMilestones]
  );

  // Collapse helpers
  const collapseMany = useEntityUIStore((s) => s.collapseMany);
  const setCollapsed = useEntityUIStore((s) => s.setCollapsed);
  const isCollapsedApi = useEntityUIStore((s) => s.isCollapsed);

  // Local reorder + server mutation
  const reorderLocal = useMilestoneStore((s) => s.reorderUnscheduledInParent);
  const reorderMutation = useReorderMilestonesHome();

  // Selection (multi-drag)
  const selectedMilestoneSet = useSelectionStore((s) => s.selected.milestone);
  const isSelected = useSelectionStore((s) => s.isSelected);

  // Overlay state
  const movingIdsRef = useRef<number[]>([]);
  const [dragCount, setDragCount] = useState(0);
  const [activeMilestone, setActiveMilestone] =
    useState<NestedMilestone | null>(null);

  // Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const idsInScopeNums = useMemo(
    () => orderedMilestones.map((m) => m.id),
    [orderedMilestones]
  );

  const onDragStart = (e: DragStartEvent) => {
    const active = e.active?.id;
    if (!active) return;

    const activeId = parseMid(String(active));

    // Build the moving group: selected ∩ this container OR just the active one
    const selected = selectedMilestoneSet
      ? Array.from(selectedMilestoneSet)
      : [];
    const selectedInThisContainer = selected.filter((id) =>
      idsInScopeNums.includes(id)
    );

    const moving =
      isSelected("milestone", activeId) && selectedInThisContainer.length > 1
        ? selectedInThisContainer
        : [activeId];

    movingIdsRef.current = moving;
    setDragCount(moving.length);

    // For single drag, clone the card in overlay
    if (moving.length === 1) {
      const m = orderedMilestones.find((x) => x.id === activeId) ?? null;
      setActiveMilestone(m);
    } else {
      setActiveMilestone(null);
    }

    // Collapse all siblings in this scope; ensure active is collapsed too
    collapseMany("milestone", idsInScopeNums);
    setCollapsed("milestone", activeId, true);
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
    // Fallback: no static neighbor found; insert at tail/head of static list
    return null;
  }

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;

    // Reset overlay state baseline
    setActiveMilestone(null);

    if (!over || active.id === over.id) {
      movingIdsRef.current = [];
      setDragCount(0);
      return;
    }

    const allIdsStr = ids; // current visible order (strings)
    const movingNums = movingIdsRef.current.length
      ? movingIdsRef.current
      : [parseMid(String(active.id))];
    const movingStrSet = new Set(movingNums.map((n) => mid(n)));

    // Compute direction using anchor indices in the full list
    const activeIdx = allIdsStr.indexOf(String(active.id));
    const overIdx = allIdsStr.indexOf(String(over.id));
    const movedDown = overIdx > activeIdx;

    // Build static + moving lists (in current order)
    const staticStr = allIdsStr.filter((idStr) => !movingStrSet.has(idStr));
    const movingStr = allIdsStr.filter((idStr) => movingStrSet.has(idStr));

    // Ensure our drop target is static; if not, resolve nearest static id
    const targetOverStr = resolveStaticOverId(
      String(over.id),
      allIdsStr,
      movingStrSet,
      movedDown
    );

    // Compute insert index in STATIC list
    let insertAt = targetOverStr ? staticStr.indexOf(targetOverStr) : -1;
    if (insertAt < 0) insertAt = movedDown ? staticStr.length : 0;

    const targetIndex = insertAt + (movedDown ? 1 : 0);

    // New order (strings)
    const newOrderStr = [
      ...staticStr.slice(0, targetIndex),
      ...movingStr,
      ...staticStr.slice(targetIndex),
    ];

    const newOrderNums = newOrderStr.map((s) => parseMid(s));

    // 🔹 Update local UI order immediately so it doesn't "snap back"
    setOrderedIds(newOrderNums);

    // 1) Local optimistic reorder (parent-scoped unscheduled in store)
    reorderLocal(parentId, newOrderNums);

    // 2) Server persist (bulk)
    const changes = newOrderNums.map((id, position) => ({ id, position }));

    const sample =
      (newOrderNums.length
        ? orderedMilestones.find((m) => m.id === newOrderNums[0])
        : orderedMilestones[0]) || null;

    if (!sample) {
      movingIdsRef.current = [];
      setDragCount(0);
      return;
    }

    const containerForApi =
      parentId != null
        ? ({ kind: "milestone", id: parentId } as const)
        : sample.projectId
        ? ({ kind: "project", id: sample.projectId } as const)
        : sample.goalId
        ? ({ kind: "goal", id: sample.goalId } as const)
        : ({ kind: "mode", id: mode.id } as const);

    reorderMutation.mutate({
      modeId: sample.modeId ?? mode.id,
      container: containerForApi,
      changes,
    });

    // Clear overlay counters
    movingIdsRef.current = [];
    setDragCount(0);
  };

  if (!orderedMilestones.length) return null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      modifiers={[restrictToVerticalAxis, restrictToFirstScrollableAncestor]}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {orderedMilestones.map((m) => (
            <SortableWithHandle
              key={`milestone-${m.id}`}
              id={mid(m.id)}
              disabled={!isCollapsedApi("milestone", m.id)}
            >
              {({ handleProps }) => (
                <MilestoneItem
                  milestone={m}
                  parentId={parentId}
                  depth={depth}
                  mode={mode}
                  modes={modes}
                  tasks={tasks}
                  // Only pass DnD listeners/attrs when collapsed (draggable)
                  dragHandleProps={
                    isCollapsedApi("milestone", m.id)
                      ? (handleProps as any)
                      : undefined
                  }
                />
              )}
            </SortableWithHandle>
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {dragCount > 1 ? (
          <div
            className="bg-white shadow-md px-3 py-2 rounded-md border text-sm font-semibold"
            style={{
              borderColor: mode.color,
              color: mode.color,
            }}
          >
            {dragCount} milestones
          </div>
        ) : activeMilestone ? (
          <div
            className="pointer-events-none rounded-md border bg-white shadow-sm dark:border-white/10"
            style={{ borderColor: mode.color }}
          >
            <MilestoneRenderer
              milestone={activeMilestone}
              mode={mode}
              collapsed
              modeColor={mode.color}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
