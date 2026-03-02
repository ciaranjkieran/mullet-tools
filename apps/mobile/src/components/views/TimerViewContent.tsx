import React, { useState, useEffect, useCallback, type ReactElement } from "react";
import { ScrollView, View, RefreshControl, AppState } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useModes } from "@shared/api/hooks/modes/useModes";
import { useGoals } from "@shared/api/hooks/goals/useGoals";
import { useProjects } from "@shared/api/hooks/projects/useProjects";
import { useMilestones } from "@shared/api/hooks/milestones/useMilestones";
import { useTasks } from "@shared/api/hooks/tasks/useTasks";
import {
  useActiveTimer,
  ACTIVE_TIMER_QK,
} from "@shared/api/hooks/timer/useActiveTimer";
import { useStartTimer } from "@shared/api/hooks/timer/useStartTimer";
import { useStopTimer } from "@shared/api/hooks/timer/useStopTimer";
import { useTimeEntries } from "@shared/api/hooks/timer/useTimeEntries";
import { useDeleteTimeEntry } from "@shared/api/hooks/timer/useDeleteTimeEntry";
import { useModeStore } from "@shared/store/useModeStore";
import { useGoalStore } from "@shared/store/useGoalStore";
import { useProjectStore } from "@shared/store/useProjectStore";
import { useMilestoneStore } from "@shared/store/useMilestoneStore";
import { useTaskStore } from "@shared/store/useTaskStore";
import type { Kind, TimeEntryDTO, StartTimerPayload } from "@shared/types/Timer";

import { useTimerTick } from "../../hooks/useTimerTick";
import TimerClock from "../timer/TimerClock";
import TimerModeToggle from "../timer/TimerModeToggle";
import DurationPicker from "../timer/DurationPicker";
import EntityPicker from "../timer/EntityPicker";
import TimeEntryList from "../timer/TimeEntryList";

type Props = {
  listHeader?: ReactElement;
};

export default function TimerViewContent({ listHeader }: Props) {
  const queryClient = useQueryClient();

  // Data hooks
  useModes();
  useGoals();
  useProjects();
  useMilestones();
  useTasks();

  const { data: activeTimer } = useActiveTimer();
  const { data: entries = [], isRefetching: entriesRefetching } =
    useTimeEntries();
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();
  const deleteEntry = useDeleteTimeEntry();

  // Store reads
  const modes = useModeStore((s) => s.modes);
  const goals = useGoalStore((s) => s.goals);
  const projects = useProjectStore((s) => s.projects);
  const milestones = useMilestoneStore((s) => s.milestones);
  const tasks = useTaskStore((s) => s.tasks);

  // Local state
  const [clockType, setClockType] = useState<Kind>("stopwatch");
  const [cdMin, setCdMin] = useState(25);
  const [cdSec, setCdSec] = useState(0);

  // Entity selection
  const [modeId, setModeId] = useState<number | null>(null);
  const [goalId, setGoalId] = useState<number | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [milestoneId, setMilestoneId] = useState<number | null>(null);
  const [taskId, setTaskId] = useState<number | null>(null);

  // Auto-select first mode if none selected
  useEffect(() => {
    if (!modeId && modes.length > 0) {
      setModeId(modes[0].id);
    }
  }, [modes, modeId]);

  // Sync selection from active timer when one exists
  useEffect(() => {
    if (activeTimer) {
      setClockType(activeTimer.kind);
      if (activeTimer.path.modeId) setModeId(activeTimer.path.modeId);
      if (activeTimer.path.goalId) setGoalId(activeTimer.path.goalId);
      if (activeTimer.path.projectId)
        setProjectId(activeTimer.path.projectId);
      if (activeTimer.path.milestoneId)
        setMilestoneId(activeTimer.path.milestoneId);
      if (activeTimer.path.taskId) setTaskId(activeTimer.path.taskId);
    }
  }, [activeTimer]);

  // Re-sync active timer on app foreground
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        queryClient.invalidateQueries({ queryKey: ACTIVE_TIMER_QK });
      }
    });
    return () => sub.remove();
  }, [queryClient]);

  // Timer tick
  const isRunning = !!activeTimer;
  const nowMs = useTimerTick(isRunning);

  // Computed
  const durationSec = cdMin * 60 + cdSec;
  const modeColor =
    modes.find((m) => m.id === modeId)?.color ??
    (modes[0]?.color || "#6b7280");

  // Handlers
  const handleStart = useCallback(() => {
    if (!modeId) return;

    const payload: StartTimerPayload = {
      kind: clockType,
      ...(clockType === "timer" ? { durationSec } : {}),
      modeId,
      ...(goalId ? { goalId } : {}),
      ...(projectId ? { projectId } : {}),
      ...(milestoneId ? { milestoneId } : {}),
      ...(taskId ? { taskId } : {}),
    };

    startTimer.mutate(payload);
  }, [
    clockType,
    durationSec,
    modeId,
    goalId,
    projectId,
    milestoneId,
    taskId,
    startTimer,
  ]);

  const handleStop = useCallback(() => {
    stopTimer.mutate();
  }, [stopTimer]);

  const handleResume = useCallback(
    (entry: TimeEntryDTO) => {
      startTimer.mutate({ resumeFromEntryId: entry.id });
    },
    [startTimer]
  );

  const handleDeleteEntry = useCallback(
    (entryId: number) => {
      deleteEntry.mutate(entryId);
    },
    [deleteEntry]
  );

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ACTIVE_TIMER_QK });
    queryClient.invalidateQueries({ queryKey: ["timer", "entries"] });
  }, [queryClient]);

  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingTop: 8 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={entriesRefetching}
          onRefresh={onRefresh}
        />
      }
    >
      {listHeader}
      {/* Stopwatch / Timer toggle */}
      <TimerModeToggle
        clockType={clockType}
        setClockType={setClockType}
        disabled={isRunning}
      />

      {/* Clock display + Start/Stop */}
      <TimerClock
        active={activeTimer ?? null}
        clockType={clockType}
        nowMs={nowMs}
        durationSec={durationSec}
        modeColor={modeColor}
        onStart={handleStart}
        onStop={handleStop}
        starting={startTimer.isPending}
        stopping={stopTimer.isPending}
      />

      {/* Duration picker (countdown mode only) */}
      {clockType === "timer" && !isRunning && (
        <DurationPicker
          minutes={cdMin}
          seconds={cdSec}
          onChangeMinutes={setCdMin}
          onChangeSeconds={setCdSec}
          disabled={isRunning}
        />
      )}

      {/* Entity selection */}
      <EntityPicker
        modes={modes}
        goals={goals}
        projects={projects}
        milestones={milestones}
        tasks={tasks}
        modeId={modeId}
        goalId={goalId}
        projectId={projectId}
        milestoneId={milestoneId}
        taskId={taskId}
        setModeId={setModeId}
        setGoalId={setGoalId}
        setProjectId={setProjectId}
        setMilestoneId={setMilestoneId}
        setTaskId={setTaskId}
        disabled={isRunning}
      />

      {/* Today's entries */}
      <TimeEntryList
        entries={entries}
        modes={modes}
        onResume={handleResume}
        onDelete={handleDeleteEntry}
      />

      {/* Bottom spacer for scroll */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
