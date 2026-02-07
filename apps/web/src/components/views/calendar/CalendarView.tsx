// src/components/views/calendar/CalendarView.tsx
"use client";

import { useState, useMemo } from "react";
import { addDays, format, parseISO, startOfToday, startOfWeek } from "date-fns";

import { Mode } from "@shared/types/Mode";
import { Milestone } from "@shared/types/Milestone";
import { Task } from "@shared/types/Task";
import { Project } from "@shared/types/Project";
import { Goal } from "@shared/types/Goal";
import { Maps } from "@shared/types/Maps";
import { useGlobalOutsideDeselect } from "../../../lib/hooks/useGlobalOutsideDeselect";
import CalendarDndProvider from "../../../components/dnd/calendar/CalendarDndProvider";
import PastDueSection from "./pastdue/PastDueSection";
import WeekSection from "./week/WeekSection";
import LookingAheadSection from "./lookingahead/LookingAheadSection";

type Props = {
  modes: Mode[];
  showModeTitle: boolean;
  isTodayFocus: boolean;
  setIsTodayFocus: (fn: (prev: boolean) => boolean) => void;
  milestones: Milestone[];
  tasks: Task[];
  projects: Project[];
  goals: Goal[];
  selectedMode: Mode | "All";
};

export function normalizeDueDates(tasks: Task[]): Task[] {
  return tasks
    .filter((task) => !!task.dueDate)
    .map((task) => ({
      ...task,
      dueDate: format(parseISO(task.dueDate!), "yyyy-MM-dd"),
    }));
}

export default function CalendarView({
  modes,
  showModeTitle,
  isTodayFocus,
  setIsTodayFocus,
  milestones,
  tasks,
  projects,
  goals,
  selectedMode,
}: Props) {
  useGlobalOutsideDeselect({ enableEsc: true });

  const [weekOffset, setWeekOffset] = useState(0);
  const today = startOfToday();

  const startOfDisplayedWeek = addDays(
    startOfWeek(today, { weekStartsOn: 1 }),
    weekOffset * 7,
  );
  const endOfDisplayedWeek = addDays(startOfDisplayedWeek, 6);

  const isCurrentWeek = weekOffset === 0; // 👈 helper

  const modeMap = useMemo(
    () => Object.fromEntries(modes.map((m) => [m.id, m])),
    [modes],
  );

  const normalizedTasks = normalizeDueDates(tasks);

  const maps: Maps = {
    goalMap: Object.fromEntries(goals.map((g) => [g.id, g])),
    projectMap: Object.fromEntries(projects.map((p) => [p.id, p])),
    milestoneMap: Object.fromEntries(milestones.map((m) => [m.id, m])),
  };

  return (
    <CalendarDndProvider modeMap={modeMap}>
      <div
        className="relative mt-4 sm:mt-6 space-y-8 sm:space-y-12"
        id="calendar-view-root"
      >
        {/* 🔴 Past Due — only show in current week and when not in Today Focus */}
        {!isTodayFocus && isCurrentWeek && (
          <PastDueSection
            todayStr={format(today, "yyyy-MM-dd")}
            modes={modes}
            milestones={milestones}
            tasks={normalizedTasks}
            projects={projects}
            goals={goals}
            showModeTitle={showModeTitle}
            selectedMode={selectedMode}
            maps={maps}
          />
        )}

        {/* 🟢 Week Section (Today + upcoming days) */}
        <WeekSection
          today={today}
          weekOffset={weekOffset}
          setWeekOffset={setWeekOffset}
          isTodayFocus={isTodayFocus}
          setIsTodayFocus={setIsTodayFocus}
          modes={modes}
          milestones={milestones}
          tasks={normalizedTasks}
          projects={projects}
          goals={goals}
          showModeTitle={showModeTitle}
          selectedMode={selectedMode}
          maps={maps}
        />

        {/* 🔵 Looking Ahead (hide in Focus Mode) */}
        {!isTodayFocus && (
          <LookingAheadSection
            endOfDisplayedWeek={endOfDisplayedWeek}
            modes={modes}
            milestones={milestones}
            tasks={normalizedTasks}
            projects={projects}
            goals={goals}
            showModeTitle={showModeTitle}
            selectedMode={selectedMode}
            maps={maps}
          />
        )}
      </div>
    </CalendarDndProvider>
  );
}
