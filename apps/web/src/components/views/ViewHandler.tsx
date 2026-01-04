"use client";

import { Mode } from "@shared/types/Mode";
import { Milestone } from "@shared/types/Milestone";
import { Task } from "@shared/types/Task";
import { Project } from "@shared/types/Project";
import { Goal } from "@shared/types/Goal";
import ModeNotesView from "@/components/notes/ModeNotesView";
import ModeBoardsView from "@/components/boards/ModeBoardsView";
import AllModeBoardsView from "@/components/boards/AllModeBoardsView";
import ModeTemplatesView from "../template/TemplatesView";
import CalendarView from "@/components/views/calendar/CalendarView";
import HomeView from "@/components/views/home/HomeView";
import TimerView from "@/components/timer/TimerView/TimerView";
import StatsView from "@/components/stats/StatsView"; // 👈 NEW
import { useViewStore } from "@shared/store/useViewStore";
import ModeCommentsView from "@/components/comments/ModeCommentsView";

type Props = {
  tasks: Task[];
  goals: Goal[];
  projects: Project[];
  milestones: Milestone[];
  modes: Mode[];
  selectedMode: Mode | "All";
  setSelectedMode: (next: Mode | "All") => void; // 👈 NEW
  showModeTitle: boolean;
  isTodayFocus: boolean;
  setIsTodayFocus: (fn: (prev: boolean) => boolean) => void;
};

export default function ViewHandler({
  tasks,
  goals,
  projects,
  milestones,
  modes,
  selectedMode,
  setSelectedMode, // 👈 NEW
  showModeTitle,
  isTodayFocus,
  setIsTodayFocus,
}: Props) {
  const viewType = useViewStore((s) => s.viewType);
  const modeColor = selectedMode === "All" ? "#000" : selectedMode.color;

  // 👇 Helper the timer will call to sync the page filter
  function setFilterModeById(id: number) {
    if (id === -1) {
      setSelectedMode("All");
      return;
    }
    const mode = modes.find((m) => m.id === id);
    if (mode) setSelectedMode(mode);
  }

  if (viewType === "comments") {
    return (
      <ModeCommentsView
        tasks={tasks}
        milestones={milestones}
        projects={projects}
        goals={goals}
        modes={modes}
        selectedMode={selectedMode}
      />
    );
  }

  if (viewType === "notes") {
    return (
      <ModeNotesView
        mode={selectedMode}
        goals={goals}
        projects={projects}
        milestones={milestones}
        tasks={tasks}
        modes={modes}
      />
    );
  }

  if (viewType === "boards") {
    return selectedMode === "All" ? (
      <AllModeBoardsView modes={modes} />
    ) : (
      <ModeBoardsView mode={selectedMode} isAllMode={false} modes={modes} />
    );
  }

  if (viewType === "templates") {
    return <ModeTemplatesView modes={modes} selectedMode={selectedMode} />;
  }

  if (viewType === "stats") {
    return (
      <StatsView
        modes={modes}
        tasks={tasks}
        goals={goals}
        projects={projects}
        milestones={milestones}
        modeColor={modeColor}
      />
    );
  }

  if (viewType === "timer") {
    return (
      <TimerView
        modes={modes}
        selectedMode={selectedMode}
        goals={goals}
        projects={projects}
        milestones={milestones}
        tasks={tasks}
        // 👇 this connects the timer's Mode dropdown to the page filter
        onRequestFilterMode={(modeId) => {
          const m = modes.find((mm) => mm.id === modeId);
          if (m) setSelectedMode(m);
        }}
      />
    );
  }

  return viewType === "calendar" ? (
    <CalendarView
      tasks={tasks}
      goals={goals}
      projects={projects}
      milestones={milestones}
      modes={modes}
      selectedMode={selectedMode}
      showModeTitle={showModeTitle}
      isTodayFocus={isTodayFocus}
      setIsTodayFocus={setIsTodayFocus}
    />
  ) : (
    <HomeView
      tasks={tasks}
      goals={goals}
      projects={projects}
      milestones={milestones}
      modes={modes}
      selectedMode={selectedMode}
    />
  );
}
