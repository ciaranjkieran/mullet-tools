// components/windows/shared/LaunchTimerRailButton.tsx
"use client";

import clsx from "clsx";
import { Timer as StopwatchIcon, Hourglass } from "lucide-react";
import { useMemo } from "react";

import { useViewStore } from "@shared/store/useViewStore";
import { useModeStore } from "@shared/store/useModeStore";
import { useTimerUIStore, type ClockType } from "@/lib/store/useTimerUIStore";
import { closeAllModals } from "../dialogs/modalBus";

import { toTimerPath, type EntityRef } from "@shared/lineage/toTimerPath";
import { pathToSelection } from "@shared/lineage/pathToSelection";

import type { Mode } from "@shared/types/Mode";
import type { Goal } from "@shared/types/Goal";
import type { Project } from "@shared/types/Project";
import type { Milestone } from "@shared/types/Milestone";
import type { Task } from "@shared/types/Task";

type Props = {
  title?: string;
  modeColor?: string;
  className?: string;

  entity: EntityRef;
  modes: Mode[];
  goals: Goal[];
  projects: Project[];
  milestones: Milestone[];
  tasks: Task[];

  setClockTypeOnLaunch?: ClockType;
  onAfterLaunch?: () => void;
};

export default function LaunchTimerRailButton(props: Props) {
  const {
    modeColor = "#555",
    className,
    entity,
    modes,
    goals,
    projects,
    milestones,
    tasks,
    setClockTypeOnLaunch,
    onAfterLaunch,
  } = props;

  const setViewType = useViewStore((s) => s.setViewType);
  const clockType = useTimerUIStore((s) => s.clockType);

  const modesInStore = useModeStore((s) => s.modes);
  const setSelectedMode = useModeStore((s) => s.setSelectedMode);

  const maps = useMemo(
    () => ({
      modesById: new Map(modes.map((m) => [m.id, m])),
      goalsById: new Map(goals.map((g) => [g.id, g])),
      projectsById: new Map(projects.map((p) => [p.id, p])),
      milestonesById: new Map(milestones.map((ms) => [ms.id, ms])),
      tasksById: new Map(tasks.map((t) => [t.id, t])),
    }),
    [modes, goals, projects, milestones, tasks]
  );

  const handleClick = () => {
    closeAllModals();

    const ui = useTimerUIStore.getState();

    const priorIntent = ui.clockTypeIntent?.value ?? null;
    const current = ui.clockType;
    const desiredClock: ClockType =
      setClockTypeOnLaunch ?? priorIntent ?? current ?? "stopwatch";

    ui.setClockType(desiredClock);
    if (ui.setClockTypeIntent) ui.setClockTypeIntent(desiredClock);

    const timerPath = toTimerPath(entity, maps);
    const rawSel = pathToSelection(timerPath, -1);

    const norm = (() => {
      const s = { ...rawSel };
      if (s.taskId != null) {
        return s;
      } else if (s.milestoneId != null) {
        return { ...s, taskId: null };
      } else if (s.projectId != null) {
        return { ...s, milestoneId: null, taskId: null };
      } else if (s.goalId != null) {
        return {
          ...s,
          projectId: null,
          milestoneId: null,
          taskId: null,
        };
      } else {
        return {
          ...s,
          goalId: null,
          projectId: null,
          milestoneId: null,
          taskId: null,
        };
      }
    })();

    const owningModeId =
      typeof norm.modeId === "number" ? norm.modeId : undefined;

    if (owningModeId != null) {
      const mode =
        modesInStore.find((m) => m.id === owningModeId) ??
        modes.find((m) => m.id === owningModeId) ??
        null;

      if (mode) {
        setSelectedMode(mode);
      }
    }

    setViewType("timer");

    queueMicrotask(() => {
      useTimerUIStore.getState().setLaunchSelectionIntent({
        modeId: norm.modeId!,
        goalId: norm.goalId ?? null,
        projectId: norm.projectId ?? null,
        milestoneId: norm.milestoneId ?? null,
        taskId: norm.taskId ?? null,
      });

      const ui2 = useTimerUIStore.getState();
      ui2.setClockType(desiredClock);
      if (ui2.setClockTypeIntent) ui2.setClockTypeIntent(desiredClock);
    });

    onAfterLaunch?.();
  };

  const dynamicLabel =
    clockType === "timer" ? "Launch in Timer" : "Launch in Stopwatch";

  return (
    <div className="relative inline-flex items-center group">
      {/* Tooltip */}
      <span
        className="
          tip-bubble
          absolute right-full mr-3 top-1/2 -translate-y-1/2
          opacity-0 group-hover:opacity-100
        "
      >
        {dynamicLabel}
      </span>

      <button
        type="button"
        aria-label={dynamicLabel}
        onClick={handleClick}
        className={clsx(
          "h-11 w-11 rounded-full grid place-items-center shadow-sm",
          "outline-none ring-0 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-black/10",
          className
        )}
        style={{
          backgroundColor: modeColor,
          color: getReadableTextColor(modeColor),
        }}
      >
        {clockType === "timer" ? (
          <Hourglass className="h-5 w-5" />
        ) : (
          <StopwatchIcon className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}

function getReadableTextColor(hex: string) {
  try {
    const c = hex.replace("#", "");
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.55 ? "#111" : "#fff";
  } catch {
    return "#fff";
  }
}
