// src/components/views/calendar/week/WeekSection.tsx
"use client";

import { addDays, format, isAfter, isSameDay, startOfWeek } from "date-fns";

import { Mode } from "@shared/types/Mode";
import { Milestone } from "@shared/types/Milestone";
import { Task } from "@shared/types/Task";
import { Project } from "@shared/types/Project";
import { Goal } from "@shared/types/Goal";
import DateSectionCalendar from "../shared/DateSectionCalendar";
import { Maps } from "@shared/types/Maps"; // or wherever you keep it

type Props = {
  today: Date;
  weekOffset: number;
  setWeekOffset: (fn: (prev: number) => number) => void;
  isTodayFocus: boolean;
  setIsTodayFocus: (fn: (prev: boolean) => boolean) => void;
  modes: Mode[];
  selectedMode: Mode | "All";
  milestones: Milestone[];
  tasks: Task[];
  projects: Project[];
  goals: Goal[];
  showModeTitle: boolean;
  maps: Maps;
};

export default function WeekSection({
  today,
  weekOffset,
  setWeekOffset,
  isTodayFocus,
  setIsTodayFocus,
  modes,
  selectedMode,
  showModeTitle,
  milestones,
  tasks,
  projects,
  goals,
  maps,
}: Props) {
  const startOfDisplayedWeek = addDays(
    startOfWeek(today, { weekStartsOn: 1 }),
    weekOffset * 7
  );
  const endOfDisplayedWeek = addDays(startOfDisplayedWeek, 6);

  const currentWeekDates = Array.from({ length: 7 }).map((_, i) => {
    const date = addDays(startOfDisplayedWeek, i);
    const isToday = isSameDay(date, today);
    const dateStr = format(date, "yyyy-MM-dd");
    const label = isToday
      ? `${format(date, "eee, MMM d")}, today.`
      : format(date, "eee, MMM d");

    return { date, dateStr, label, isToday };
  });

  const filtered = currentWeekDates.filter(({ date }) => {
    if (isTodayFocus) return isSameDay(date, today);
    if (weekOffset === 0) return isSameDay(date, today) || isAfter(date, today);
    return true;
  });

  return (
    <section className="space-y-8">
      {!isTodayFocus && (
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            {weekOffset === 0 && "This Week, "}
            {weekOffset === 0
              ? `${format(today, "MMM d")} – ${format(
                  endOfDisplayedWeek,
                  "MMM d"
                )}`
              : `${format(startOfDisplayedWeek, "MMM d")} – ${format(
                  endOfDisplayedWeek,
                  "MMM d"
                )}`}
          </h2>

          <div className="flex items-center space-x-4 text-sm">
            {weekOffset > 0 && (
              <>
                <button
                  onClick={() => setWeekOffset(() => 0)}
                  className="text-blue-900 hover:underline cursor-pointer"
                >
                  Back to This Week
                </button>
                <button
                  onClick={() => setWeekOffset((prev) => Math.max(prev - 1, 0))}
                  className="text-blue-900 hover:underline font-medium cursor-pointer"
                >
                  ← Previous
                </button>
              </>
            )}
            <button
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="text-blue-900 hover:underline font-medium cursor-pointer"
            >
              Next Week →
            </button>
          </div>
        </div>
      )}

      {filtered.map(({ dateStr, label, isToday }) => (
        <DateSectionCalendar
          key={dateStr}
          dateStr={dateStr}
          label={label}
          isToday={isToday}
          isTodayFocus={isTodayFocus}
          setIsTodayFocus={setIsTodayFocus}
          modes={modes}
          selectedMode={selectedMode}
          milestones={milestones}
          tasks={tasks}
          projects={projects}
          goals={goals}
          showModeTitle={showModeTitle}
          maps={maps}
        />
      ))}
    </section>
  );
}
