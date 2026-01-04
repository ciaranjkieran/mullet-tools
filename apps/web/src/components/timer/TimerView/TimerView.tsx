"use client";

/**
 * TimerView
 *
 * A presentational component that renders:
 * - Clock header (stopwatch/timer state)
 * - Countdown settings
 * - Selection panel (mode/goal/project/milestone/task)
 * - Today's entries list
 *
 * All logic lives in `useTimerController`.
 */

import { Mode } from "@shared/types/Mode";
import { Goal } from "@shared/types/Goal";
import { Project } from "@shared/types/Project";
import { Milestone } from "@shared/types/Milestone";
import { Task } from "@shared/types/Task";

import { Hourglass, Timer as TimerIcon } from "lucide-react";

import { useTimerController } from "../hooks/useTimerController";

import TimerClockHeader from "../clock/TimerClockHeader";
import CountdownSettingsCard from "../countdown/CountdownSettingsCard";
import TimerSelectionCard from "../selection/TimerSelectionCard";
import TodayEntriesCard from "../entries/TodayEntriesCard";
import TimerModeToggle from "../TimerModeToggle";

type Props = {
  modes: Mode[];
  selectedMode: Mode | "All";
  goals: Goal[];
  projects: Project[];
  milestones: Milestone[];
  tasks: Task[];
  onRequestFilterMode?: (modeId: number) => void;
};

export default function TimerView({
  modes,
  selectedMode,
  goals,
  projects,
  milestones,
  tasks,
  onRequestFilterMode,
}: Props) {
  const {
    // core
    active,
    entries,
    now,

    // mode + color
    isAllMode,
    selectedModeForUI,
    modeColor,

    // selection state
    modeId,
    goalId,
    projectId,
    milestoneId,
    taskId,
    setModeId,
    setGoalId,
    setProjectId,
    setMilestoneId,
    setTaskId,

    // clock type
    clockType,
    setClockType,

    // countdown
    cdMin,
    cdSec,
    setCdMin,
    setCdSec,
    durationSec,
    remainingLive,

    // breadcrumbs
    leafTitle,
    ancestors,

    // actions
    showSwitch,
    handleSwitchToSelection,
    handleStart,
    handleStop,
    handleResumeFromEntry,
    resolvePlannedSeconds,
    fetchedAtMs,
    didCompleteStop,

    // ✅ Complete
    handleComplete,
    isCompleting,
  } = useTimerController({
    modes,
    selectedMode,
    goals,
    projects,
    milestones,
    tasks,
    onRequestFilterMode,
  });

  // ─────────────────────────────────────────────
  // UI derivations for countdown end behaviour
  // ─────────────────────────────────────────────

  // Raw remaining: when not running, controller may give null, so fall back
  const liveRemaining =
    typeof remainingLive === "number"
      ? remainingLive
      : active?.kind === "timer"
      ? 0
      : durationSec ?? 0;
  const effectiveKind = active?.kind ?? clockType;

  const timerHasElapsed =
    effectiveKind === "timer" &&
    typeof liveRemaining === "number" &&
    liveRemaining <= 0;

  const isActiveForUI =
    !!active && (effectiveKind === "stopwatch" || !timerHasElapsed);

  // Has the countdown fully elapsed?

  // What should we show on the clock?
  // - While running: the live remaining seconds.
  // - After expiry: snap back to the configured duration.
  const displaySeconds = timerHasElapsed ? durationSec ?? 0 : liveRemaining;

  // UI-active:
  // - Stopwatch: stays active while `active` is truthy.
  // - Timer: only active while remaining > 0.

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-10">
      {/* Hide timer UI when filtering by "All" */}
      {!isAllMode && (
        <>
          {/* Header / Icons */}
          <div className="flex justify-between items-center mb-6">
            <div>
              {clockType === "stopwatch" ? (
                <TimerIcon className="h-14 w-14 text-gray-700" />
              ) : (
                <Hourglass className="h-14 w-14 text-gray-700" />
              )}
            </div>

            <TimerModeToggle
              value={clockType}
              onChange={(val) => setClockType(val)}
              color={modeColor}
            />
          </div>

          {/* Active session breadcrumb */}
          {isActiveForUI && (
            <div className="mb-6">
              <div className="text-[11px] uppercase tracking-wide text-gray-700 mb-1">
                Now working on
              </div>

              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-bold text-black text-3xl leading-snug">
                  {leafTitle}
                </span>

                {ancestors.map((c, i) => (
                  <span
                    key={`${c.type}-${c.id}-${i}`}
                    className="flex items-baseline gap-2"
                  >
                    <span className="text-gray-400">|</span>
                    <span className="text-sm text-gray-700">{c.title}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Clock */}
          <TimerClockHeader
            // When the timer has expired, present as inactive so the button shows "Start"
            active={isActiveForUI ? active : null}
            clockType={effectiveKind}
            now={now}
            durationSec={timerHasElapsed ? durationSec ?? 0 : liveRemaining}
            cdMin={cdMin}
            cdSec={cdSec}
            modeColor={modeColor}
            activeColor={modeColor}
            onStart={handleStart}
            onStop={handleStop}
            fetchedAtMs={fetchedAtMs}
          />

          {/* Countdown settings */}
          {clockType === "timer" && (
            <CountdownSettingsCard
              cdMin={cdMin}
              cdSec={cdSec}
              setCdMin={setCdMin}
              setCdSec={setCdSec}
              modeColor={modeColor}
            />
          )}

          {/* Selection panel */}
          <TimerSelectionCard
            modes={modes}
            goals={goals}
            projects={projects}
            milestones={milestones}
            tasks={tasks}
            selectedMode={selectedModeForUI}
            modeColor={modeColor}
            modeId={modeId}
            setModeId={setModeId}
            goalId={goalId}
            setGoalId={setGoalId}
            projectId={projectId}
            setProjectId={setProjectId}
            milestoneId={milestoneId}
            setMilestoneId={setMilestoneId}
            taskId={taskId}
            setTaskId={setTaskId}
            showSwitch={showSwitch}
            onSwitchToSelection={handleSwitchToSelection}
            onRequestFilterMode={onRequestFilterMode}
            // ✅ NEW props
            isActiveSession={isActiveForUI && !didCompleteStop}
            isCompleting={isCompleting}
            onComplete={handleComplete}
            completeLabelTitle={leafTitle}
          />
        </>
      )}

      <TodayEntriesCard
        entries={entries}
        modes={modes}
        goals={goals}
        projects={projects}
        milestones={milestones}
        tasks={tasks}
        modeColor={modeColor}
        onResume={handleResumeFromEntry}
        filterModeId={isAllMode ? null : (selectedMode as Mode).id}
        resolvePlannedSeconds={resolvePlannedSeconds}
        onRequestFilterMode={onRequestFilterMode}
      />
    </div>
  );
}
