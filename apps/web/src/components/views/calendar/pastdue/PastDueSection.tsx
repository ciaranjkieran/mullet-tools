// src/components/views/calendar/past-due/PastDueSection.tsx
"use client";

import { Mode } from "@shared/types/Mode";
import { Milestone } from "@shared/types/Milestone";
import { Task } from "@shared/types/Task";
import { Project } from "@shared/types/Project";
import { Goal } from "@shared/types/Goal";
import DateSectionCalendar from "../shared/DateSectionCalendar";
import { useBulkMoveTasks } from "@shared/api/hooks/tasks/useBulkMoveTasks";
import { useBulkMoveMilestones } from "@shared/api/hooks/milestones/useBulkMoveMilestones";
import { useBulkMoveProjects } from "@shared/api/hooks/projects/useBulkMoveProjects";
import { useBulkMoveGoals } from "@shared/api/hooks/goals/useBulkMoveGoals";
import { format, parseISO, isBefore, startOfDay } from "date-fns";
import { ArrowDown } from "lucide-react";
import { Maps } from "@shared/types/Maps"; // or wherever you keep it
import { useSectionOpen, pastDueKey } from "@/lib/store/useUIPrefs";

type Props = {
  todayStr: string;
  modes: Mode[];
  selectedMode: Mode | "All";
  milestones: Milestone[];
  tasks: Task[];
  projects: Project[];
  goals: Goal[];
  showModeTitle: boolean;
  maps: Maps;
};

export default function PastDueSection({
  modes,
  selectedMode,
  milestones,
  tasks,
  projects,
  goals,
  showModeTitle,
  maps,
}: Props) {
  const { mutate: bulkMoveTasks } = useBulkMoveTasks();
  const { mutate: bulkMoveMilestones } = useBulkMoveMilestones();
  const { mutate: bulkMoveProjects } = useBulkMoveProjects();
  const { mutate: bulkMoveGoals } = useBulkMoveGoals();
  const { isOpen, toggle } = useSectionOpen(pastDueKey(), true);

  const today = startOfDay(new Date()); // normalize "today" to midnight
  const isPastDue = (date?: string | null) =>
    date ? isBefore(parseISO(date), today) : false;
  const pastTasks = tasks.filter(
    (t) =>
      isPastDue(t.dueDate) &&
      (selectedMode === "All" ||
        (t.modeId &&
          modes.find((m) => m.id === t.modeId)?.id === selectedMode.id))
  );

  const pastMilestones = milestones.filter(
    (m) =>
      isPastDue(m.dueDate) &&
      (selectedMode === "All" ||
        (m.modeId &&
          modes.find((mo) => mo.id === m.modeId)?.id === selectedMode.id))
  );

  const pastProjects = projects.filter(
    (p) =>
      isPastDue(p.dueDate) &&
      (selectedMode === "All" ||
        (p.modeId &&
          modes.find((m) => m.id === p.modeId)?.id === selectedMode.id))
  );

  const pastGoals = goals.filter(
    (g) =>
      isPastDue(g.dueDate) &&
      (selectedMode === "All" ||
        (g.modeId &&
          modes.find((m) => m.id === g.modeId)?.id === selectedMode.id))
  );
  if (
    ![pastGoals, pastMilestones, pastProjects, pastTasks].some(
      (arr) => arr.length > 0
    )
  ) {
    return null;
  }
  console.log({
    pastGoals,
    pastMilestones,
    pastProjects,
    pastTasks,
  });

  return (
    <section className="mt-2">
      <div className="flex items-center justify-end mb-1">
        <button
          onClick={toggle}
          className="text-sm font-semibold text-blue-900 hover:underline cursor-pointer"
        >
          {isOpen ? "Hide Past Due" : "Show Past Due"}
        </button>
      </div>

      {isOpen && (
        <>
          <DateSectionCalendar
            dateStr="past-due"
            label="Past Due"
            modes={modes}
            selectedMode={selectedMode}
            milestones={milestones}
            tasks={tasks}
            projects={projects}
            goals={goals}
            showModeTitle={showModeTitle}
            maps={maps}
          />

          <div className="flex justify-end mt-2">
            <button
              onClick={() => {
                const todayStr = format(today, "yyyy-MM-dd");

                bulkMoveTasks({
                  taskIds: pastTasks.map((t) => t.id),
                  dueDate: todayStr,
                });

                bulkMoveMilestones({
                  milestoneIds: pastMilestones.map((m) => m.id),
                  dueDate: todayStr,
                });

                bulkMoveProjects({
                  projectIds: pastProjects.map((p) => p.id),
                  dueDate: todayStr,
                });

                bulkMoveGoals({
                  goalIds: pastGoals.map((g) => g.id),
                  dueDate: todayStr,
                });
              }}
              className="text-sm font-medium hover:underline inline-flex items-center gap-1 cursor-pointer text-rose-900"
            >
              <ArrowDown size={14} strokeWidth={2} />
              Move all to Today
            </button>
          </div>
        </>
      )}
    </section>
  );
}
