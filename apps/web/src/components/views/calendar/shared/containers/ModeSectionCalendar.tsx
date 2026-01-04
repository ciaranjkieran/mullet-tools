// src/components/views/calendar/shared/ModeSectionCalendar.tsx
"use client";

import { Mode } from "@shared/types/Mode";
import { Milestone } from "@shared/types/Milestone";
import { Task } from "@shared/types/Task";
import { Project } from "@shared/types/Project";
import { Goal } from "@shared/types/Goal";

import TaskListCalendar from "@/components/entities/tasks/containers/calendar/TaskListCalendar";
import MilestoneListCalendar from "@/components/entities/milestones/containers/calendar/MilestoneListCalendar";
import ProjectListCalendar from "@/components/entities/projects/containers/calendar/ProjectListCalendar";
import GoalListCalendar from "@/components/entities/goals/containers/calendar/GoalListCalendar";

import { ModeDroppable } from "../../../../dnd/calendar/ModeDroppableDnd";
import { CalendarListDnD } from "../../../../dnd/calendar/CalendarListDnd";

import { Maps } from "@shared/types/Maps";

type Props = {
  mode: Mode;
  tasks: Task[];
  milestones: Milestone[];
  projects: Project[];
  goals: Goal[];
  showModeTitle: boolean;
  maps: Maps;
  dateStr: string; // ← provided by EntityBlockByDate
};

export default function ModeSectionCalendar({
  mode,
  tasks,
  milestones,
  projects,
  goals,
  showModeTitle,
  maps,
  dateStr,
}: Props) {
  const hasContent =
    tasks.length > 0 ||
    milestones.length > 0 ||
    projects.length > 0 ||
    goals.length > 0;

  if (!hasContent) return null;

  const isPastDue = dateStr === "past-due";

  // For cross-date moves phase we want ONLY the Date droppable active.
  // Disable inner targets (mode band + lists) so hovering over tasks/lists
  // doesn’t “steal” the drop from the date background.
  const innerDropsEnabled = false;

  return (
    <ModeDroppable
      modeId={mode.id}
      dateStr={dateStr}
      disabled={isPastDue || !innerDropsEnabled}
    >
      <div className="mt-2 flex flex-col gap-2">
        {tasks.length > 0 && (
          <CalendarListDnD
            entityType="task"
            modeId={mode.id}
            dateStr={dateStr}
            disabled={isPastDue || !innerDropsEnabled}
          >
            <TaskListCalendar
              tasks={tasks}
              mode={mode}
              showModeTitle={showModeTitle}
              maps={maps}
              // isToday left false here; Today variant handles sorting separately
            />
          </CalendarListDnD>
        )}

        {milestones.length > 0 && (
          <CalendarListDnD
            entityType="milestone"
            modeId={mode.id}
            dateStr={dateStr}
            disabled={isPastDue || !innerDropsEnabled}
          >
            <MilestoneListCalendar
              milestones={milestones}
              mode={mode}
              showModeTitle={showModeTitle}
              maps={maps}
            />
          </CalendarListDnD>
        )}

        {projects.length > 0 && (
          <CalendarListDnD
            entityType="project"
            modeId={mode.id}
            dateStr={dateStr}
            disabled={isPastDue || !innerDropsEnabled}
          >
            <ProjectListCalendar
              projects={projects}
              mode={mode}
              showModeTitle={showModeTitle}
              maps={maps}
            />
          </CalendarListDnD>
        )}

        {goals.length > 0 && (
          <CalendarListDnD
            entityType="goal"
            modeId={mode.id}
            dateStr={dateStr}
            disabled={isPastDue || !innerDropsEnabled}
          >
            <GoalListCalendar
              goals={goals}
              mode={mode}
              showModeTitle={showModeTitle}
            />
          </CalendarListDnD>
        )}
      </div>
    </ModeDroppable>
  );
}
