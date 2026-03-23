import React, { useState, useEffect, useCallback, useMemo, useRef, type ReactElement } from "react";
import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator, RefreshControl, AppState } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useTimerLaunchStore } from "../../lib/store/useTimerLaunchStore";
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
import { useCompleteNextTimer } from "@shared/api/hooks/timer/useCompleteNextTimer";
import { useTimeEntries } from "@shared/api/hooks/timer/useTimeEntries";
import { useDeleteTimeEntry } from "@shared/api/hooks/timer/useDeleteTimeEntry";
import { useModeStore } from "@shared/store/useModeStore";
import { useGoalStore } from "@shared/store/useGoalStore";
import { useProjectStore } from "@shared/store/useProjectStore";
import { useMilestoneStore } from "@shared/store/useMilestoneStore";
import { useTaskStore } from "@shared/store/useTaskStore";
import type { Kind, TimeEntryDTO, StartTimerPayload } from "@shared/types/Timer";
import {
  makeProjectMaps,
  makeMilestoneMaps,
  projectEffectiveLineage,
  milestoneEffectiveLineage,
} from "@shared/lineage/effective";

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
  const completeNext = useCompleteNextTimer();
  const deleteEntry = useDeleteTimeEntry();

  // Store reads
  const modes = useModeStore((s) => s.modes);
  const selectedMode = useModeStore((s) => s.selectedMode);
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

  // Sync with app-wide mode filter (only when idle)
  useEffect(() => {
    if (activeTimer) return; // don't change mode while a session is running
    if (selectedMode === "All") {
      // When "All" is selected, default to first mode
      if (!modeId && modes.length > 0) {
        setModeId(modes[0].id);
      }
    } else if (modeId !== selectedMode.id) {
      setModeId(selectedMode.id);
    }
  }, [selectedMode, modes, modeId, activeTimer]);

  // Consume launch intent from entity windows
  const launchIntent = useTimerLaunchStore((s) => s.launchIntent);
  useEffect(() => {
    if (!launchIntent) return;
    const intent = useTimerLaunchStore.getState().consumeLaunchIntent();
    if (!intent) return;
    setModeId(intent.modeId);
    setGoalId(intent.goalId);
    setProjectId(intent.projectId);
    setMilestoneId(intent.milestoneId);
    setTaskId(intent.taskId);
  }, [launchIntent]);

  // Sync selection from active timer when one exists, resolving lineage.
  // Only run when the active timer's identity changes, not on every refetch.
  const activeTimerId = activeTimer?.startedAt ?? null;
  useEffect(() => {
    if (!activeTimer) return;
    setClockType(activeTimer.kind);

    const p = activeTimer.path;
    if (p.modeId) setModeId(p.modeId);
    setTaskId(p.taskId ?? null);

    // Resolve lineage for missing parent IDs
    let resolvedGoalId = p.goalId ?? null;
    let resolvedProjectId = p.projectId ?? null;
    const resolvedMilestoneId = p.milestoneId ?? null;

    if (resolvedMilestoneId != null) {
      const msMaps = makeMilestoneMaps(milestones);
      const projMaps = makeProjectMaps(projects);
      const eff = milestoneEffectiveLineage(resolvedMilestoneId, msMaps.byId, projMaps.byId);
      if (resolvedProjectId == null && eff.projectId != null) resolvedProjectId = eff.projectId;
      if (resolvedGoalId == null && eff.goalId != null) resolvedGoalId = eff.goalId;
    } else if (resolvedProjectId != null) {
      const projMaps = makeProjectMaps(projects);
      const eff = projectEffectiveLineage(resolvedProjectId, projMaps.byId);
      if (resolvedGoalId == null && eff.goalId != null) resolvedGoalId = eff.goalId;
    }

    setMilestoneId(resolvedMilestoneId);
    setProjectId(resolvedProjectId);
    setGoalId(resolvedGoalId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTimerId]);

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

  // Auto-stop countdown timer when it reaches zero
  const didAutoStopRef = useRef(false);
  useEffect(() => {
    if (!activeTimer || activeTimer.kind !== "timer") {
      didAutoStopRef.current = false;
      return;
    }
    const endsAt = activeTimer.endsAt;
    if (typeof endsAt === "string" && endsAt.length > 0) {
      const remainingSec = Math.ceil(Date.parse(endsAt) / 1000 - Date.now() / 1000);
      if (remainingSec <= 0 && !didAutoStopRef.current) {
        didAutoStopRef.current = true;
        stopTimer.mutate();
      }
    }
  }, [activeTimer, nowMs, stopTimer]);

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

  // Determine the deepest entity being timed (for complete button)
  const activeEntity = useMemo(() => {
    if (!activeTimer) return null;
    const p = activeTimer.path;
    if (p.taskId) return { entityType: "task" as const, entityId: p.taskId };
    if (p.milestoneId) return { entityType: "milestone" as const, entityId: p.milestoneId };
    if (p.projectId) return { entityType: "project" as const, entityId: p.projectId };
    if (p.goalId) return { entityType: "goal" as const, entityId: p.goalId };
    return null; // only mode — no complete button
  }, [activeTimer]);

  // Resolve the name of the entity being completed
  const activeEntityName = useMemo(() => {
    if (!activeEntity) return null;
    const { entityType, entityId } = activeEntity;
    if (entityType === "task") return tasks.find((t) => t.id === entityId)?.title ?? null;
    if (entityType === "milestone") return milestones.find((m) => m.id === entityId)?.title ?? null;
    if (entityType === "project") return projects.find((p) => p.id === entityId)?.title ?? null;
    if (entityType === "goal") return goals.find((g) => g.id === entityId)?.title ?? null;
    return null;
  }, [activeEntity, tasks, milestones, projects, goals]);

  const handleComplete = useCallback(() => {
    if (!activeEntity) return;
    completeNext.mutate(activeEntity);
  }, [activeEntity, completeNext]);

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
      contentContainerStyle={{ paddingTop: 8 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={entriesRefetching}
          onRefresh={onRefresh}
        />
      }
    >
      {listHeader}
      <View style={{ paddingHorizontal: 20 }}>
        {/* Stopwatch / Timer toggle */}
        <TimerModeToggle
          clockType={clockType}
          setClockType={setClockType}
          disabled={isRunning}
          modeColor={modeColor}
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

        {/* Complete button — shown below the dropdowns when timing an entity */}
        {isRunning && activeEntity && (
          <TouchableOpacity
            onPress={handleComplete}
            disabled={completeNext.isPending}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#14532D",
              paddingVertical: 12,
              paddingHorizontal: 20,
              borderRadius: 10,
              gap: 8,
              marginTop: 16,
              opacity: completeNext.isPending ? 0.5 : 1,
            }}
          >
            {completeNext.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="check" size={18} color="#fff" />
                <Text
                  style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}
                  numberOfLines={1}
                >
                  {activeEntityName
                    ? `Complete "${activeEntityName}"`
                    : "Complete"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <View style={{ height: 24 }} />

        {/* Today's entries */}
        <TimeEntryList
          entries={entries}
          modes={modes}
          onResume={handleResume}
          onDelete={handleDeleteEntry}
          filterModeId={modeId}
        />

        {/* Bottom spacer for scroll */}
        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}
