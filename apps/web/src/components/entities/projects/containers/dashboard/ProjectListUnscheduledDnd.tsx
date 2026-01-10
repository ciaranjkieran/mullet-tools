// components/entities/projects/lists/ProjectUnscheduledDnd.tsx
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

import { useReorderProjectsHome } from "@shared/api/hooks/projects/useReorderProjectsHome";
import { useProjectStore } from "@shared/store/useProjectStore";

import { NestedProject } from "../../utils/buildProjectTree";
import { pid, parsePid } from "../../dnd/dashboard/dndIdsProjects";
import SortableWithHandle from "../../../../common/SortableWithHandle";
import ProjectItem from "./ProjectItem";
import ProjectRenderer from "../../renderers/dashboard/ProjectRendererDashboard";

import { useEntityUIStore } from "@/lib/store/useEntityUIStore";
import { useSelectionStore } from "@/lib/store/useSelectionStore";
import type { Container } from "./ProjectList";

type Props = {
  parentId: number | null;
  projects: NestedProject[];
  depth: number;
  mode: Mode;
  modes: Mode[];
  tasks: Task[];
  milestones: Milestone[];
  container?: Container;
};

export default function ProjectUnscheduledDnd({
  parentId,
  projects,
  depth,
  mode,
  modes,
  tasks,
  milestones,
  container,
}: Props) {
  // Filter out any undefined/ill-shaped items once up-front
  const safeProjects = useMemo(
    () =>
      (projects ?? []).filter(
        (p): p is NestedProject => !!p && typeof p.id === "number"
      ),
    [projects]
  );

  // Visible ids for this container (string-coded with pid)
  const ids = useMemo(() => safeProjects.map((p) => pid(p.id)), [safeProjects]);

  // Collapse helpers (do not read collapsed.project directly)
  const collapseMany = useEntityUIStore((s) => s.collapseMany);
  const setCollapsed = useEntityUIStore((s) => s.setCollapsed);
  const isCollapsedApi = useEntityUIStore((s) => s.isCollapsed);

  // Local reorder + server mutation
  const reorderLocal = useProjectStore((s) => s.reorderUnscheduledInParent);
  const reorderMutation = useReorderProjectsHome();

  // Selection (multi-drag)
  const selectedProjectSet = useSelectionStore((s) => s.selected.project);
  const isSelected = useSelectionStore((s) => s.isSelected);

  // Overlay state
  const movingIdsRef = useRef<number[]>([]);
  const [dragCount, setDragCount] = useState(0);
  const [activeProject, setActiveProject] = useState<NestedProject | null>(
    null
  );

  // Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const idsInScopeNums = useMemo(
    () => safeProjects.map((p) => p.id),
    [safeProjects]
  );

  const onDragStart = (e: DragStartEvent) => {
    const active = e.active?.id;
    if (!active) return;

    const activeId = parsePid(String(active));

    // Build the moving group: selected ∩ this container OR just the active one
    const selected = selectedProjectSet ? Array.from(selectedProjectSet) : [];
    const selectedInThisContainer = selected.filter((id) =>
      idsInScopeNums.includes(id)
    );

    const moving =
      isSelected("project", activeId) && selectedInThisContainer.length > 1
        ? selectedInThisContainer
        : [activeId];

    movingIdsRef.current = moving;
    setDragCount(moving.length);

    // For single drag, clone the card in overlay
    if (moving.length === 1) {
      const found = safeProjects.find((x) => x.id === activeId) ?? null;
      setActiveProject(found);
    } else {
      setActiveProject(null);
    }

    // Collapse all siblings in this scope; ensure active is collapsed too
    collapseMany("project", idsInScopeNums);
    setCollapsed("project", activeId, true);
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
    setActiveProject(null);

    if (!over || active.id === over.id) {
      movingIdsRef.current = [];
      setDragCount(0);
      return;
    }

    const allIdsStr = ids; // current visible order (strings)
    const movingNums = movingIdsRef.current.length
      ? movingIdsRef.current
      : [parsePid(String(active.id))];
    const movingStrSet = new Set(movingNums.map((n) => pid(n)));

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

    const newOrderNums = newOrderStr.map((s) => parsePid(s));

    // 1) Local optimistic reorder (parent-scoped unscheduled)
    reorderLocal(parentId, newOrderNums);

    // 2) Server persist (bulk)
    const changes = newOrderNums.map((id, position) => ({ id, position }));

    // For projects: container is parent project OR mode root
    const sample =
      (newOrderNums.length
        ? safeProjects.find((p) => p.id === newOrderNums[0])
        : safeProjects[0]) || null;

    if (!sample) {
      movingIdsRef.current = [];
      setDragCount(0);
      return;
    }

    const targetContainer =
      parentId != null
        ? ({ kind: "project", id: parentId } as const)
        : container?.kind === "goal" && container.id != null
        ? ({ kind: "goal", id: container.id } as const)
        : ({ kind: "mode", id: mode.id } as const);

    reorderMutation.mutate({
      modeId: sample.modeId ?? mode.id,
      container: targetContainer,
      changes,
    });

    // Clear overlay counters
    movingIdsRef.current = [];
    setDragCount(0);
  };

  if (!safeProjects.length) return null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      modifiers={[restrictToVerticalAxis, restrictToFirstScrollableAncestor]}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {safeProjects.map((p) => {
            const collapsed = isCollapsedApi("project", p.id);
            return (
              <SortableWithHandle
                key={`project-${p.id}`}
                id={pid(p.id)}
                disabled={!collapsed}
              >
                {({ handleProps }) => (
                  <ProjectItem
                    project={p}
                    parentId={parentId}
                    depth={depth}
                    mode={mode}
                    modes={modes}
                    tasks={tasks}
                    milestones={milestones}
                    dragHandleProps={
                      collapsed
                        ? (handleProps as React.HTMLAttributes<HTMLButtonElement>)
                        : undefined
                    }
                  />
                )}
              </SortableWithHandle>
            );
          })}
        </div>
      </SortableContext>

      <DragOverlay>
        {dragCount > 1 ? (
          <div className="bg-white shadow-md px-3 py-2 rounded-md border border-gray-200 text-sm font-semibold">
            {dragCount} projects
          </div>
        ) : activeProject ? (
          <div className="pointer-events-none rounded-md border border-gray-200 dark:border-white/10 bg-white shadow-sm">
            <ProjectRenderer
              project={activeProject}
              collapsed
              modeColor={mode.color}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
