"use client";

import { useViewStore } from "@shared/store/useViewStore";

import type { Mode } from "@shared/types/Mode";
import type { Milestone } from "@shared/types/Milestone";
import type { Task } from "@shared/types/Task";
import type { Project } from "@shared/types/Project";
import type { Goal } from "@shared/types/Goal";

import ModeNotesView from "@/components/notes/ModeNotesView";
import ModeBoardsView from "@/components/boards/ModeBoardsView";
import AllModeBoardsView from "@/components/boards/AllModeBoardsView";
import ModeTemplatesView from "@/components/template/TemplatesView";
import CalendarView from "@/components/views/calendar/CalendarView";
import HomeView from "@/components/views/home/HomeView";
import TimerView from "@/components/timer/TimerView/TimerView";
import StatsView from "@/components/stats/StatsView";
import ModeCommentsView from "@/components/comments/ModeCommentsView";

type Props = {
  tasks: Task[];
  goals: Goal[];
  projects: Project[];
  milestones: Milestone[];
  modes: Mode[];
  selectedMode: Mode | "All";
  setSelectedMode: (next: Mode | "All") => void;
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
  setSelectedMode,
  showModeTitle,
  isTodayFocus,
  setIsTodayFocus,
}: Props) {
  const viewType = useViewStore((s) => s.viewType) as any;

  // Back-compat: if your store still uses "dashboard" for home, treat it as "home"
  const view = viewType === "dashboard" ? "home" : viewType;

  const modeColor = selectedMode === "All" ? "#000" : selectedMode.color;

  if (view === "home") {
    return (
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

  if (view === "calendar") {
    return (
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
    );
  }

  if (view === "comments") {
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

  if (view === "notes") {
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

  if (view === "boards") {
    return selectedMode === "All" ? (
      <AllModeBoardsView modes={modes} />
    ) : (
      <ModeBoardsView mode={selectedMode} isAllMode={false} modes={modes} />
    );
  }

  if (view === "templates") {
    return <ModeTemplatesView modes={modes} selectedMode={selectedMode} />;
  }

  if (view === "stats") {
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

  if (view === "timer") {
    return (
      <TimerView
        modes={modes}
        selectedMode={selectedMode}
        goals={goals}
        projects={projects}
        milestones={milestones}
        tasks={tasks}
        onRequestFilterMode={(modeId) => {
          const m = modes.find((mm) => mm.id === modeId);
          if (m) setSelectedMode(m);
        }}
      />
    );
  }

  // Safe fallback
  return (
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
