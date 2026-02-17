// src/components/views/calendar/looking-ahead/LookingAheadSection.tsx
"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { formatDateLabel } from "@/lib/utils/formatDateLabel";
import { Mode } from "@shared/types/Mode";
import { Milestone } from "@shared/types/Milestone";
import { Task } from "@shared/types/Task";
import { Project } from "@shared/types/Project";
import { Goal } from "@shared/types/Goal";
import DateSectionCalendar from "../shared/DateSectionCalendar";
import { Maps } from "@shared/types/Maps"; // or wherever you keep it
import { useSectionOpen, lookingAheadKey } from "@/lib/store/useUIPrefs";

type Props = {
  endOfDisplayedWeek: Date;
  modes: Mode[];
  milestones: Milestone[];
  tasks: Task[];
  projects: Project[];
  goals: Goal[];
  showModeTitle: boolean;
  selectedMode: Mode | "All";
  maps: Maps;
};

export default function LookingAheadSection({
  endOfDisplayedWeek,
  modes,
  milestones,
  tasks,
  projects,
  goals,
  showModeTitle,
  selectedMode,
  maps,
}: Props) {
  const { isOpen, toggle } = useSectionOpen(lookingAheadKey(), true); // default closed

  const endOfWeekStr = format(endOfDisplayedWeek, "yyyy-MM-dd");

  const allDueDates = new Set<string>();

  const filterByMode = (entity: { modeId?: number }) => {
    if (selectedMode === "All") return true;
    return entity.modeId === selectedMode.id;
  };

  [tasks, milestones, projects, goals].forEach((entityList) => {
    entityList.filter(filterByMode).forEach((entity) => {
      if (!entity.dueDate) return;
      const dateStr = entity.dueDate.slice(0, 10);
      if (dateStr > endOfWeekStr) {
        allDueDates.add(dateStr);
      }
    });
  });

  const sorted = Array.from(allDueDates).sort();

  // 🔒 Early return if there's nothing to display
  if (sorted.length === 0) return null;

  return (
    <section className="mt-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-md font-semibold">Looking Ahead</h3>
        <button
          onClick={toggle}
          className="text-sm font-semibold text-blue-900 hover:underline cursor-pointer"
        >
          {isOpen ? "Hide" : "Show"}
        </button>
      </div>

      {isOpen &&
        sorted.map((dateStr) => {
          const date = parseISO(dateStr);
          const label = formatDateLabel(date, "eeee, MMM d");
          return (
            <DateSectionCalendar
              key={dateStr}
              dateStr={dateStr}
              label={label}
              modes={modes}
              milestones={milestones}
              tasks={tasks}
              projects={projects}
              goals={goals}
              showModeTitle={showModeTitle}
              selectedMode={selectedMode}
              maps={maps}
            />
          );
        })}
    </section>
  );
}
