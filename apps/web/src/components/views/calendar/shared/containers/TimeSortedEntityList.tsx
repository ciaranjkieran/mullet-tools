// src/components/views/calendar/shared/containers/TimeSortedEntityList.tsx
"use client";

import { format, parseISO } from "date-fns";
import { Mode } from "@shared/types/Mode";
import { Task } from "@shared/types/Task";
import { Milestone } from "@shared/types/Milestone";
import { Project } from "@shared/types/Project";
import { Goal } from "@shared/types/Goal";
import { Maps, getEntityBreadcrumb } from "@shared/utils/getEntityBreadcrumb";

import CalendarEntityDragCard from "../../../../dnd/calendar/CalendarEntityDragCard";
import TaskRendererCalendar from "@/components/entities/tasks/renderers/calendar/TaskRendererCalendar";
import MilestoneRendererCalendar from "@/components/entities/milestones/renderers/calendar/MilestoneRendererCalendar";
import ProjectRendererCalendar from "@/components/entities/projects/renderers/calendar/ProjectRendererCalendar";
import GoalRendererCalendar from "@/components/entities/goals/renderers/calendar/GoalRendererCalendar";

import type {
  DragAttributes,
  DragListeners,
} from "@/components/dnd/calendar/dragTypes";

type Props = {
  tasks: Task[];
  milestones: Milestone[];
  projects: Project[];
  goals: Goal[];
  modes: Mode[];
  showModeTitle: boolean;
  maps: Maps;
};

type CalendarItem =
  | { kind: "task"; entity: Task; modeId: number }
  | { kind: "milestone"; entity: Milestone; modeId: number }
  | { kind: "project"; entity: Project; modeId: number }
  | { kind: "goal"; entity: Goal; modeId: number };

const TYPE_RANK: Record<string, number> = {
  task: 0,
  milestone: 1,
  project: 2,
  goal: 3,
};

function minutesFromTime(t?: string | null): number {
  if (!t) return Number.POSITIVE_INFINITY;
  const [hh, mm] = t.split(":").map((v) => parseInt(v, 10));
  return Number.isNaN(hh) || Number.isNaN(mm)
    ? Number.POSITIVE_INFINITY
    : hh * 60 + mm;
}

function getDueTime(item: CalendarItem): string | null | undefined {
  return (item.entity as any).dueTime;
}

export default function TimeSortedEntityList({
  tasks,
  milestones,
  projects,
  goals,
  modes,
  showModeTitle,
  maps,
}: Props) {
  const modeMap = Object.fromEntries(modes.map((m) => [m.id, m]));
  const modePositionMap = Object.fromEntries(
    modes.map((m) => [m.id, m.position])
  );

  // Merge all entities into a flat list
  const items: CalendarItem[] = [
    ...tasks.map((t) => ({ kind: "task" as const, entity: t, modeId: t.modeId })),
    ...milestones.map((m) => ({ kind: "milestone" as const, entity: m, modeId: m.modeId })),
    ...projects.map((p) => ({ kind: "project" as const, entity: p, modeId: p.modeId })),
    ...goals.map((g) => ({ kind: "goal" as const, entity: g, modeId: g.modeId })),
  ];

  // Sort: timed first globally → time ascending → mode position → entity type rank → alphabetical
  const sorted = [...items].sort((a, b) => {
    const aTime = getDueTime(a);
    const bTime = getDueTime(b);
    const aHasTime = !!aTime;
    const bHasTime = !!bTime;

    // Timed items first
    if (aHasTime !== bHasTime) return aHasTime ? -1 : 1;
    // Within timed: sort by time ascending
    if (aHasTime && bHasTime) {
      const cmp = aTime!.localeCompare(bTime!);
      if (cmp !== 0) return cmp;
    }

    // Then by mode position
    const modeA = modePositionMap[a.modeId] ?? 999;
    const modeB = modePositionMap[b.modeId] ?? 999;
    if (modeA !== modeB) return modeA - modeB;

    // Then by entity type rank (tasks first)
    const typeA = TYPE_RANK[a.kind] ?? 9;
    const typeB = TYPE_RANK[b.kind] ?? 9;
    if (typeA !== typeB) return typeA - typeB;

    // Then alphabetical
    return a.entity.title.localeCompare(b.entity.title);
  });

  return (
    <div className="mt-2 flex flex-col gap-2">
      {sorted.map((item) => {
        const mode = modeMap[item.modeId];

        switch (item.kind) {
          case "task": {
            const task = item.entity;
            return (
              <CalendarEntityDragCard
                key={`task:${task.id}`}
                meta={{
                  entityType: "task",
                  id: task.id,
                  modeId: task.modeId,
                  dateStr: task.dueDate
                    ? format(parseISO(task.dueDate), "yyyy-MM-dd")
                    : null,
                  title: task.title,
                }}
                variant="draggable"
              >
                {({ dragAttributes, dragListeners, setActivatorNodeRef }) => (
                  <TaskRendererCalendar
                    task={task}
                    mode={mode}
                    showModeTitle={showModeTitle}
                    breadcrumb={getEntityBreadcrumb(task, maps, {
                      immediateOnly: true,
                    })}
                    dragAttributes={dragAttributes as DragAttributes | undefined}
                    dragListeners={dragListeners as DragListeners | undefined}
                    activatorRef={setActivatorNodeRef}
                  />
                )}
              </CalendarEntityDragCard>
            );
          }
          case "milestone": {
            const milestone = item.entity;
            return (
              <CalendarEntityDragCard
                key={`milestone:${milestone.id}`}
                meta={{
                  entityType: "milestone",
                  id: milestone.id,
                  modeId: milestone.modeId,
                  dateStr: milestone.dueDate
                    ? format(parseISO(milestone.dueDate), "yyyy-MM-dd")
                    : null,
                  title: milestone.title,
                }}
                variant="draggable"
              >
                {({ dragAttributes, dragListeners, setActivatorNodeRef }) => (
                  <MilestoneRendererCalendar
                    milestone={milestone}
                    mode={mode}
                    showModeTitle={showModeTitle}
                    breadcrumb={getEntityBreadcrumb(milestone, maps, {
                      immediateOnly: true,
                    })}
                    dragAttributes={dragAttributes as DragAttributes | undefined}
                    dragListeners={dragListeners as DragListeners | undefined}
                    activatorRef={setActivatorNodeRef}
                  />
                )}
              </CalendarEntityDragCard>
            );
          }
          case "project": {
            const project = item.entity;
            return (
              <CalendarEntityDragCard
                key={`project:${project.id}`}
                meta={{
                  entityType: "project",
                  id: project.id,
                  modeId: project.modeId,
                  dateStr: project.dueDate
                    ? format(parseISO(project.dueDate), "yyyy-MM-dd")
                    : null,
                  title: project.title,
                }}
                variant="draggable"
              >
                {({ dragAttributes, dragListeners, setActivatorNodeRef }) => (
                  <ProjectRendererCalendar
                    project={project}
                    mode={mode}
                    showModeTitle={showModeTitle}
                    breadcrumb={getEntityBreadcrumb(project, maps, {
                      immediateOnly: true,
                    })}
                    dragAttributes={dragAttributes as DragAttributes | undefined}
                    dragListeners={dragListeners as DragListeners | undefined}
                    activatorRef={setActivatorNodeRef}
                  />
                )}
              </CalendarEntityDragCard>
            );
          }
          case "goal": {
            const goal = item.entity;
            return (
              <CalendarEntityDragCard
                key={`goal:${goal.id}`}
                meta={{
                  entityType: "goal",
                  id: goal.id,
                  modeId: goal.modeId,
                  dateStr: goal.dueDate
                    ? format(parseISO(goal.dueDate), "yyyy-MM-dd")
                    : null,
                  title: goal.title,
                }}
                variant="draggable"
              >
                {({ dragAttributes, dragListeners, setActivatorNodeRef }) => (
                  <GoalRendererCalendar
                    goal={goal}
                    mode={mode}
                    showModeTitle={showModeTitle}
                    dragAttributes={dragAttributes as DragAttributes | undefined}
                    dragListeners={dragListeners as DragListeners | undefined}
                    activatorRef={setActivatorNodeRef}
                  />
                )}
              </CalendarEntityDragCard>
            );
          }
        }
      })}
    </div>
  );
}
