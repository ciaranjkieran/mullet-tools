// src/components/views/calendar/shared/EntityBlockByDate.tsx
"use client";

import { Mode } from "@shared/types/Mode";
import { Milestone } from "@shared/types/Milestone";
import { Task } from "@shared/types/Task";
import { Project } from "@shared/types/Project";
import { Goal } from "@shared/types/Goal";
import { Maps } from "@shared/types/Maps";

import ModeSectionCalendar from "./ModeSectionCalendar";
import TodayDailyOrderList from "../../week/today/containers/TodayDailyOrderList";
import TimeSortedEntityList from "./TimeSortedEntityList";
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
  sortByTime?: boolean;
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
  sortByTime = false,
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

  // Time-sorted view: flat list across all modes sorted by time
  if (sortByTime) {
    const allTasks = modesToRender.flatMap((mode) =>
      filteredTasks.filter((t) => t.modeId === mode.id)
    );
    const allMilestones = modesToRender.flatMap((mode) =>
      filteredMilestones.filter((m) => m.modeId === mode.id)
    );
    const allProjects = modesToRender.flatMap((mode) =>
      filteredProjects.filter((p) => p.modeId === mode.id)
    );
    const allGoals = modesToRender.flatMap((mode) =>
      filteredGoals.filter((g) => g.modeId === mode.id)
    );

    return (
      <TimeSortedEntityList
        tasks={allTasks}
        milestones={allMilestones}
        projects={allProjects}
        goals={allGoals}
        modes={modes}
        showModeTitle={showModeTitle}
        maps={maps}
      />
    );
  }

  // Today: flat cross-mode sortable list with daily order persistence
  if (isToday) {
    const modeIdSet = new Set(modesToRender.map((m) => m.id));
    return (
      <TodayDailyOrderList
        tasks={filteredTasks.filter((t) => modeIdSet.has(t.modeId))}
        milestones={filteredMilestones.filter((m) => modeIdSet.has(m.modeId))}
        projects={filteredProjects.filter((p) => modeIdSet.has(p.modeId))}
        goals={filteredGoals.filter((g) => modeIdSet.has(g.modeId))}
        modes={modes}
        maps={maps}
        showModeTitle={showModeTitle}
        dateStr={dateStr}
      />
    );
  }

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
            <ModeSectionCalendar
              mode={mode}
              tasks={modeTasks}
              milestones={modeMilestones}
              projects={modeProjects}
              goals={modeGoals}
              showModeTitle={showModeTitle}
              maps={maps}
              dateStr={dateStr}
            />
          </div>
        );
      })}
    </>
  );
}
