"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
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
} from "@dnd-kit/sortable";

import { Task } from "@shared/types/Task";
import { Milestone } from "@shared/types/Milestone";
import { Project } from "@shared/types/Project";
import { Goal } from "@shared/types/Goal";
import { Mode } from "@shared/types/Mode";
import { Maps, getEntityBreadcrumb } from "@shared/utils/getEntityBreadcrumb";
import { useDailyOrder } from "@shared/api/hooks/dailyOrder/useDailyOrder";
import { useSetDailyOrder } from "@shared/api/hooks/dailyOrder/useSetDailyOrder";

import CalendarEntityDragCard from "@/components/dnd/calendar/CalendarEntityDragCard";
import TaskRendererCalendar from "@/components/entities/tasks/renderers/calendar/TaskRendererCalendar";
import MilestoneRendererCalendar from "@/components/entities/milestones/renderers/calendar/MilestoneRendererCalendar";
import ProjectRendererCalendar from "@/components/entities/projects/renderers/calendar/ProjectRendererCalendar";
import GoalRendererCalendar from "@/components/entities/goals/renderers/calendar/GoalRendererCalendar";

import type {
  DragAttributes,
  DragListeners,
} from "@/components/dnd/calendar/dragTypes";

type EntityType = "task" | "milestone" | "project" | "goal";

type UnifiedItem = {
  key: string;
  entityType: EntityType;
  entityId: number;
  entity: Task | Milestone | Project | Goal;
  mode: Mode | undefined;
  modePosition: number;
  dueTime?: string | null;
  title: string;
};

type Props = {
  tasks: Task[];
  milestones: Milestone[];
  projects: Project[];
  goals: Goal[];
  modes: Mode[];
  maps: Maps;
  showModeTitle: boolean;
  dateStr: string;
};

const ENTITY_TYPE_RANK: Record<EntityType, number> = {
  goal: 0,
  project: 1,
  milestone: 2,
  task: 3,
};

function minutesFromTime(t?: string | null): number {
  if (!t) return Number.POSITIVE_INFINITY;
  const [hh, mm] = t.split(":").map((v) => parseInt(v, 10));
  return Number.isNaN(hh) || Number.isNaN(mm)
    ? Number.POSITIVE_INFINITY
    : hh * 60 + mm;
}

function defaultSort(a: UnifiedItem, b: UnifiedItem): number {
  if (a.modePosition !== b.modePosition) return a.modePosition - b.modePosition;
  const ta = minutesFromTime(a.dueTime);
  const tb = minutesFromTime(b.dueTime);
  if (ta !== tb) return ta - tb;
  const ra = ENTITY_TYPE_RANK[a.entityType];
  const rb = ENTITY_TYPE_RANK[b.entityType];
  if (ra !== rb) return ra - rb;
  return a.title.localeCompare(b.title);
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const result = [...arr];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}

export default function TodayDailyOrderList({
  tasks,
  milestones,
  projects,
  goals,
  modes,
  maps,
  showModeTitle,
  dateStr,
}: Props) {
  const { data: savedOrder } = useDailyOrder(dateStr);
  const { mutate: setDailyOrder } = useSetDailyOrder();
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const modeMap = useMemo(
    () => Object.fromEntries(modes.map((m) => [m.id, m])),
    [modes],
  );

  const allItems: UnifiedItem[] = useMemo(() => {
    const items: UnifiedItem[] = [];
    for (const t of tasks) {
      const mode = modeMap[t.modeId];
      items.push({
        key: `task:${t.id}`,
        entityType: "task",
        entityId: t.id,
        entity: t,
        mode,
        modePosition: mode?.position ?? 0,
        dueTime: t.dueTime,
        title: t.title,
      });
    }
    for (const m of milestones) {
      const mode = modeMap[m.modeId];
      items.push({
        key: `milestone:${m.id}`,
        entityType: "milestone",
        entityId: m.id,
        entity: m,
        mode,
        modePosition: mode?.position ?? 0,
        dueTime: m.dueTime,
        title: m.title,
      });
    }
    for (const p of projects) {
      const mode = modeMap[p.modeId];
      items.push({
        key: `project:${p.id}`,
        entityType: "project",
        entityId: p.id,
        entity: p,
        mode,
        modePosition: mode?.position ?? 0,
        dueTime: p.dueTime,
        title: p.title,
      });
    }
    for (const g of goals) {
      const mode = modeMap[g.modeId];
      items.push({
        key: `goal:${g.id}`,
        entityType: "goal",
        entityId: g.id,
        entity: g,
        mode,
        modePosition: mode?.position ?? 0,
        dueTime: g.dueTime,
        title: g.title,
      });
    }
    return items;
  }, [tasks, milestones, projects, goals, modeMap]);

  const orderedItems = useMemo(() => {
    if (!savedOrder?.length) {
      return [...allItems].sort(defaultSort);
    }
    const orderMap = new Map<string, number>();
    for (const o of savedOrder) {
      orderMap.set(`${o.entity_type}:${o.entity_id}`, o.position);
    }
    const ordered = allItems
      .filter((it) => orderMap.has(it.key))
      .sort((a, b) => orderMap.get(a.key)! - orderMap.get(b.key)!);
    const unordered = allItems
      .filter((it) => !orderMap.has(it.key))
      .sort(defaultSort);
    return [...ordered, ...unordered];
  }, [allItems, savedOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveKey(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveKey(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedItems.findIndex((it) => it.key === active.id);
    const newIndex = orderedItems.findIndex((it) => it.key === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(orderedItems, oldIndex, newIndex);
    setDailyOrder({
      dateStr,
      items: newOrder.map((it, i) => ({
        entity_type: it.entityType,
        entity_id: it.entityId,
        position: i,
      })),
    });
  };

  const activeItem = activeKey
    ? orderedItems.find((it) => it.key === activeKey) ?? null
    : null;

  if (orderedItems.length === 0) return null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={orderedItems.map((it) => it.key)}
        strategy={verticalListSortingStrategy}
      >
        <div className="mt-2 flex flex-col gap-2">
          {orderedItems.map((item) => (
            <TodayOrderItem
              key={item.key}
              item={item}
              maps={maps}
              showModeTitle={showModeTitle}
              dateStr={dateStr}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay
        dropAnimation={{ duration: 150, easing: "cubic-bezier(0.2, 0, 0, 1)" }}
      >
        {activeItem && (
          <div className="pointer-events-none">
            <ItemRenderer
              item={activeItem}
              maps={maps}
              showModeTitle={showModeTitle}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function TodayOrderItem({
  item,
  maps,
  showModeTitle,
  dateStr,
}: {
  item: UnifiedItem;
  maps: Maps;
  showModeTitle: boolean;
  dateStr: string;
}) {
  return (
    <CalendarEntityDragCard
      meta={{
        entityType: item.entityType,
        id: item.entityId,
        modeId: item.mode?.id ?? 0,
        dateStr,
        title: item.title,
      }}
      variant="sortable"
    >
      {({ dragAttributes, dragListeners, setActivatorNodeRef }) => (
        <ItemRenderer
          item={item}
          maps={maps}
          showModeTitle={showModeTitle}
          dragAttributes={dragAttributes as DragAttributes | undefined}
          dragListeners={dragListeners as DragListeners | undefined}
          activatorRef={setActivatorNodeRef}
        />
      )}
    </CalendarEntityDragCard>
  );
}

function ItemRenderer({
  item,
  maps,
  showModeTitle,
  dragAttributes,
  dragListeners,
  activatorRef,
}: {
  item: UnifiedItem;
  maps: Maps;
  showModeTitle: boolean;
  dragAttributes?: DragAttributes;
  dragListeners?: DragListeners;
  activatorRef?: (el: HTMLElement | null) => void;
}) {
  switch (item.entityType) {
    case "task":
      return (
        <TaskRendererCalendar
          task={item.entity as Task}
          mode={item.mode}
          showModeTitle={showModeTitle}
          breadcrumb={getEntityBreadcrumb(item.entity as Task, maps, {
            immediateOnly: true,
          })}
          dragAttributes={dragAttributes}
          dragListeners={dragListeners}
          activatorRef={activatorRef}
        />
      );
    case "milestone":
      return (
        <MilestoneRendererCalendar
          milestone={item.entity as Milestone}
          mode={item.mode}
          showModeTitle={showModeTitle}
          breadcrumb={getEntityBreadcrumb(item.entity as Milestone, maps, {
            immediateOnly: true,
          })}
          dragAttributes={dragAttributes}
          dragListeners={dragListeners}
          activatorRef={activatorRef}
        />
      );
    case "project":
      return (
        <ProjectRendererCalendar
          project={item.entity as Project}
          mode={item.mode}
          showModeTitle={showModeTitle}
          breadcrumb={getEntityBreadcrumb(item.entity as Project, maps, {
            immediateOnly: true,
          })}
          dragAttributes={dragAttributes}
          dragListeners={dragListeners}
          activatorRef={activatorRef}
        />
      );
    case "goal":
      return (
        <GoalRendererCalendar
          goal={item.entity as Goal}
          mode={item.mode}
          showModeTitle={showModeTitle}
          dragAttributes={dragAttributes}
          dragListeners={dragListeners}
          activatorRef={activatorRef}
        />
      );
  }
}
