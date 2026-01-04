// src/components/views/calendar/shared/EntityBlockByDate.tsx
"use client";

import { Mode } from "@shared/types/Mode";
import { Milestone } from "@shared/types/Milestone";
import { Task } from "@shared/types/Task";
import { Project } from "@shared/types/Project";
import { Goal } from "@shared/types/Goal";
import { Maps } from "@shared/types/Maps";

import ModeSectionCalendar from "./ModeSectionCalendar";
import TodayModeSectionCalendar from "../../week/today/containers/TodayModeSectionCalendar";
import { isBefore, parseISO, startOfToday } from "date-fns";

type Props = {
  isToday: boolean;
  dateStr: string;
  modes: Mode[];
  selectedMode: Mode | "All";
  tasks: Task[];
  milestones: Milestone[];
  projects: Project[];
  goals: Goal[];
  showModeTitle: boolean;
  maps: Maps;
};

export default function EntityBlockByDate({
  isToday,
  dateStr,
  modes,
  showModeTitle,
  selectedMode,
  tasks,
  milestones,
  projects,
  goals,
  maps,
}: Props) {
  const today = startOfToday();
  const isPastDue = dateStr === "past-due";

  const filteredTasks = isPastDue
    ? tasks.filter((t) => t.dueDate && isBefore(parseISO(t.dueDate), today))
    : tasks.filter((t) => t.dueDate === dateStr);

  const filteredMilestones = isPastDue
    ? milestones.filter(
        (m) => m.dueDate && isBefore(parseISO(m.dueDate), today)
      )
    : milestones.filter((m) => m.dueDate === dateStr);

  const filteredProjects = isPastDue
    ? projects.filter((p) => p.dueDate && isBefore(parseISO(p.dueDate), today))
    : projects.filter((p) => p.dueDate === dateStr);

  const filteredGoals = isPastDue
    ? goals.filter((g) => g.dueDate && isBefore(parseISO(g.dueDate), today))
    : goals.filter((g) => g.dueDate === dateStr);

  const modeIdsInTasks = new Set(filteredTasks.map((t) => t.modeId));
  const modeIdsInMilestones = new Set(filteredMilestones.map((m) => m.modeId));
  const modeIdsInProjects = new Set(filteredProjects.map((p) => p.modeId));
  const modeIdsInGoals = new Set(filteredGoals.map((g) => g.modeId));

  const modeIdsToInclude = new Set([
    ...modeIdsInTasks,
    ...modeIdsInMilestones,
    ...modeIdsInProjects,
    ...modeIdsInGoals,
  ]);

  const modesToRender =
    selectedMode === "All"
      ? modes.filter((m) => modeIdsToInclude.has(m.id))
      : modes.filter((m) => m.id === (selectedMode as Mode).id);

  const ModeComponent = isToday
    ? TodayModeSectionCalendar
    : ModeSectionCalendar;

  return (
    <>
      {modesToRender.map((mode) => {
        const modeTasks = filteredTasks.filter((t) => t.modeId === mode.id);
        const modeMilestones = filteredMilestones.filter(
          (m) => m.modeId === mode.id
        );
        const modeProjects = filteredProjects.filter(
          (p) => p.modeId === mode.id
        );
        const modeGoals = filteredGoals.filter((g) => g.modeId === mode.id);

        return (
          <div className="mb-2 last:mb-0" key={mode.id}>
            <ModeComponent
              mode={mode}
              tasks={modeTasks}
              milestones={modeMilestones}
              projects={modeProjects}
              goals={modeGoals}
              showModeTitle={showModeTitle}
              maps={maps}
              dateStr={dateStr} // used by ModeSectionCalendar for droppable ids
            />
          </div>
        );
      })}
    </>
  );
}
