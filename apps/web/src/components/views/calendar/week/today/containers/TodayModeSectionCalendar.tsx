// src/components/views/calendar/week/today/containers/TodayModeSectionCalendar.tsx
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
import { Maps } from "@shared/types/Maps";

type Props = {
  mode: Mode;
  tasks: Task[];
  milestones: Milestone[];
  projects: Project[];
  goals: Goal[];
  showModeTitle: boolean;
  maps: Maps;
  // (No dateStr needed here; Today list is always sortable)
};

export default function TodayModeSectionCalendar({
  mode,
  tasks,
  milestones,
  projects,
  goals,
  showModeTitle,
  maps,
}: Props) {
  const hasContent =
    tasks.length > 0 ||
    milestones.length > 0 ||
    projects.length > 0 ||
    goals.length > 0;

  if (!hasContent) return null;

  return (
    <div className="mt-2 flex flex-col gap-2">
      {tasks.length > 0 && (
        <TaskListCalendar
          tasks={tasks}
          mode={mode}
          showModeTitle={showModeTitle}
          maps={maps}
          isToday={true} // ✅ enable sortable variant for Today
        />
      )}
      {milestones.length > 0 && (
        <MilestoneListCalendar
          milestones={milestones}
          mode={mode}
          showModeTitle={showModeTitle}
          maps={maps}
          isToday={true} // if your milestone list supports sortable-on-today
        />
      )}
      {projects.length > 0 && (
        <ProjectListCalendar
          projects={projects}
          mode={mode}
          showModeTitle={showModeTitle}
          maps={maps}
          isToday={true} // if your project list supports sortable-on-today
        />
      )}
      {goals.length > 0 && (
        <GoalListCalendar
          goals={goals}
          mode={mode}
          showModeTitle={showModeTitle}
          isToday={true} // if your goal list supports sortable-on-today
        />
      )}
    </div>
  );
}
