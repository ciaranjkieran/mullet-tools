// src/components/views/calendar/DateSectionCalendar.tsx
"use client";

import { Mode } from "@shared/types/Mode";
import { Milestone } from "@shared/types/Milestone";
import { Task } from "@shared/types/Task";
import { Project } from "@shared/types/Project";
import { Goal } from "@shared/types/Goal";
import EntityBlockByDate from "./containers/EntityBlockByDate";
import { useState } from "react";
import { isBefore, parseISO, startOfToday } from "date-fns";
import AddTaskInline from "../../../entities/tasks/windows/AddTaskInline";
import { Maps } from "@shared/types/Maps";
import { DateDroppable } from "../../../dnd/calendar/DateDroppable";
import { ArrowUpDown, Clock, LocateFixed, X } from "lucide-react";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";

type Props = {
  dateStr: string;
  label: string;
  isToday?: boolean;
  isTodayFocus?: boolean;
  setIsTodayFocus?: (fn: (prev: boolean) => boolean) => void;
  showModeTitle: boolean;
  modes: Mode[];
  milestones: Milestone[];
  tasks: Task[];
  projects: Project[];
  goals: Goal[];
  selectedMode: Mode | "All";
  maps: Maps;
};

export default function DateSectionCalendar({
  dateStr,
  label,
  isToday = false,
  isTodayFocus = false,
  setIsTodayFocus,
  modes,
  showModeTitle,
  milestones,
  tasks,
  projects,
  goals,
  selectedMode,
  maps,
}: Props) {
  const [sortByTime, setSortByTime] = useState(false);
  const today = startOfToday();
  const isPastDue = dateStr === "past-due";
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const hasEntities = (() => {
    if (isPastDue) {
      return tasks.some(
        (t) =>
          t.dueDate &&
          isBefore(parseISO(t.dueDate), today) &&
          (selectedMode === "All" || t.modeId === (selectedMode as Mode).id),
      );
    }

    const hasTasks = tasks.some(
      (t) =>
        t.dueDate === dateStr &&
        (selectedMode === "All" || t.modeId === (selectedMode as Mode).id),
    );
    const hasMilestones = milestones.some(
      (m) =>
        m.dueDate === dateStr &&
        (selectedMode === "All" || m.modeId === (selectedMode as Mode).id),
    );
    const hasProjects = projects.some(
      (p) =>
        p.dueDate === dateStr &&
        (selectedMode === "All" || p.modeId === (selectedMode as Mode).id),
    );
    const hasGoals = goals.some(
      (g) =>
        g.dueDate === dateStr &&
        (selectedMode === "All" || g.modeId === (selectedMode as Mode).id),
    );

    return hasTasks || hasMilestones || hasProjects || hasGoals;
  })();

  return (
    <DateDroppable dateStr={dateStr} disabled={isPastDue}>
      <div className="space-y-2 mt-6">
        {/* Title Row */}
        <div className="flex items-center justify-between mb-1">
          {label && (
            <h3 className="text-md text-black-500 border-b border-gray-300 pb-0 mb-1 px-1">
              {label}
            </h3>
          )}

          <div className="flex items-center gap-1">
            {!isPastDue && (
              <button
                onClick={() => setSortByTime((prev) => !prev)}
                aria-label={sortByTime ? "Sort by mode" : "Sort by time"}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                  sortByTime
                    ? "bg-blue-100 text-blue-700 border border-blue-300"
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-100 border border-transparent"
                }`}
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                <Clock className="h-3.5 w-3.5" />
              </button>
            )}

            {isToday && setIsTodayFocus && (
              <button
                onClick={() => setIsTodayFocus((prev) => !prev)}
                aria-label={isTodayFocus ? "Exit Focus Mode" : "Enter Focus Mode"}
                className="text-green-700 hover:text-green-800 transition ml-1 p-1 rounded-sm focus:outline-none focus:ring-2 focus:ring-green-300 cursor-pointer"
              >
                {isTodayFocus ? (
                  <X className="h-5 w-5" />
                ) : (
                  <LocateFixed className="h-6 w-6" />
                )}
              </button>
            )}
          </div>
        </div>

        <EntityBlockByDate
          isToday={isToday}
          dateStr={dateStr}
          modes={modes}
          showModeTitle={showModeTitle}
          tasks={tasks}
          milestones={milestones}
          projects={projects}
          goals={goals}
          selectedMode={selectedMode}
          maps={maps}
          sortByTime={sortByTime}
        />

        {!hasEntities && !isPastDue && (
          <div className="bg-gray-50 rounded-sm p-4 min-h-[96px] border border-gray-300 text-gray-400 text-sm italic">
            Nothing scheduled yet.
          </div>
        )}
        {isDesktop && !isPastDue && (
          <AddTaskInline
            inlineMode={selectedMode}
            modes={modes}
            variant="calendar"
            initialDueDate={dateStr}
            onAfterCreate={() => {}}
          />
        )}
      </div>
    </DateDroppable>
  );
}
