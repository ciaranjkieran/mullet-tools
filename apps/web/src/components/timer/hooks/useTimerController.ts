/**
 * useTimerController
 *
 * Orchestrates all TimerView behaviour:
 * - active timer polling & ticking
 * - selection persistence & per-mode snapshots
 * - launch intents (from rail buttons)
 * - one-shot server → client hydration with snapshots
 * - "Switch to selection" baseline behaviour
 * - resume-from-entry logic
 * - breadcrumbs
 * - sync with external Mode filter
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useCompleteNextTimer } from "./useCompleteNextTimer";
import { useCallback } from "react"; // add useCallback at top

import type { Mode } from "@shared/types/Mode";
import type { Goal } from "@shared/types/Goal";
import type { Project } from "@shared/types/Project";
import type { Milestone } from "@shared/types/Milestone";
import type { Task } from "@shared/types/Task";

import { useActiveTimer } from "@shared/api/hooks/timer/useActiveTimer";
import { useStartTimer } from "@shared/api/hooks/timer/useStartTimer";
import { useStopTimer } from "@shared/api/hooks/timer/useStopTimer";
import { useTimeEntries } from "@shared/api/hooks/timer/useTimeEntries";

import { useRetargetActiveTimer } from "../utils/useRetargetActiveTimer";
import { useActiveTimerPolling } from "../hooks/useActiveTimerPolling";
import { useTimerTick } from "../hooks/useTimerTick";

import { useTimerSelectionStore } from "@/lib/store/useTimerSelectionStore";
import { useTimerUIStore } from "@/lib/store/useTimerUIStore";

import {
  makeProjectMaps,
  makeMilestoneMaps,
  milestoneEffectiveLineage,
  projectEffectiveLineage,
} from "@shared/lineage/effective";

import { sameSelection } from "../utils/selectionDiff";
import { buildStartPayloadFromSelection } from "../utils/startTimerPayload";
import { pathToIdPayload } from "../utils/timerPath";

import { useTimerClockType } from "./useTimerClockType";
import { useTimerBreadcrumbs } from "./useTimerBreadcrumbs";
import { useTimerResumeFromEntry } from "./useTimerResumeFromEntry";
import {
  normalizePathIdsToSelection,
  resolveModeIdFromPathStrict,
  type SelectionLike,
  type TimerPathIds,
} from "../types/timerTypes";

type Args = {
  modes: Mode[];
  selectedMode: Mode | "All";
  goals: Goal[];
  projects: Project[];
  milestones: Milestone[];
  tasks: Task[];
  onRequestFilterMode?: (modeId: number) => void;
};
type TaskWithLinks = Task & {
  goalId?: number | null;
  projectId?: number | null;
  milestoneId?: number | null;
};

export function useTimerController({
  modes,
  selectedMode,
  goals,
  projects,
  milestones,
  tasks,
  onRequestFilterMode,
}: Args) {
  const { data: active, dataUpdatedAt } = useActiveTimer();
  const startMut = useStartTimer();
  const stopMut = useStopTimer();
  const { data: entries = [] } = useTimeEntries();
  const { mutateAsync: _retargetAsync } = useRetargetActiveTimer();

  useActiveTimerPolling(active);
  const now = useTimerTick(100);
  const [didCompleteStop, setDidCompleteStop] = useState(false);

  // selection (persisted)
  const {
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
    saveSnapshotForMode,
    getSnapshotForMode,
    hydratedSessionId,
    markHydratedSession,
  } = useTimerSelectionStore();

  // shared refs for launch/restore/baseline interplay
  const skipOneRestoreRef = useRef(false);
  const forceParentsNoneOnceRef = useRef<{
    clearProject: boolean;
    clearMilestone: boolean;
    clearTask: boolean;
  } | null>(null);
  const lastStoppedSelRef = useRef<SelectionLike | null>(null);
  const commitTokenRef = useRef(0);
  const completeNextMut = useCompleteNextTimer();
  const completingRef = useRef(false);

  // track explicit launches so restore doesn't stomp on them
  const launchGenerationRef = useRef(0);
  const lastRestoreSeenLaunchRef = useRef(0);

  // snapshot of current selection (for baseline & re-reads)
  function snapshotCurrentSelection(): SelectionLike {
    const s = useTimerSelectionStore.getState();
    return {
      modeId: s.modeId,
      goalId: s.goalId,
      projectId: s.projectId,
      milestoneId: s.milestoneId,
      taskId: s.taskId,
    };
  }

  // Active path → ids
  const pathIds: TimerPathIds = useMemo(
    () => (active?.path ? pathToIdPayload(active.path) : {}),
    [active?.path]
  );

  // True session mode id from server path (no fallback)
  const activeSessionModeId: number | null = useMemo(
    () =>
      active
        ? resolveModeIdFromPathStrict(pathIds, {
            goals,
            projects,
            milestones,
            tasks,
          })
        : null,
    [active, pathIds, goals, projects, milestones, tasks]
  );

  // When the page filter is "All", show the dropdown’s mode as the UI mode
  const selectedModeForUI: Mode | "All" =
    selectedMode === "All"
      ? modes.find((m) => m.id === modeId) ?? "All"
      : selectedMode;

  // Colours derived from the UI-visible mode
  const modeColor =
    selectedModeForUI === "All" ? "#9CA3AF" : (selectedModeForUI as Mode).color;

  // shared maps for restore + launch
  const projectsById = useMemo(
    () => makeProjectMaps(projects).byId,
    [projects]
  );
  const milestonesById = useMemo(
    () => makeMilestoneMaps(milestones).byId,
    [milestones]
  );
  const tasksWithLinks = useMemo(() => tasks as TaskWithLinks[], [tasks]);

  const taskById = useMemo(
    () => new Map(tasksWithLinks.map((t) => [t.id, t])),
    [tasksWithLinks]
  );
  type EntityType = "task" | "milestone" | "project" | "goal";

  function getDeepestEntity(selection: {
    taskId: number | null;
    milestoneId: number | null;
    projectId: number | null;
    goalId: number | null;
  }): { entityType: EntityType; entityId: number } | null {
    if (selection.taskId != null)
      return { entityType: "task", entityId: selection.taskId };
    if (selection.milestoneId != null)
      return { entityType: "milestone", entityId: selection.milestoneId };
    if (selection.projectId != null)
      return { entityType: "project", entityId: selection.projectId };
    if (selection.goalId != null)
      return { entityType: "goal", entityId: selection.goalId };
    return null;
  }

  function applyPathToSelection(path: {
    modeId: number | null;
    goalId: number | null;
    projectId: number | null;
    milestoneId: number | null;
    taskId: number | null;
  }) {
    if (typeof path.modeId === "number") setModeId(path.modeId);

    setGoalId(path.goalId ?? null);
    setProjectId(path.projectId ?? null);
    setMilestoneId(path.milestoneId ?? null);
    setTaskId(path.taskId ?? null);
  }
  function sortByPosition<T extends { position: number; id: number }>(
    arr: T[]
  ) {
    return [...arr].sort((a, b) => a.position - b.position || a.id - b.id);
  }

  function nextAfter<T extends { position: number; id: number }>(
    ordered: T[],
    currentId: number
  ): T | null {
    if (!ordered.length) return null;
    const idx = ordered.findIndex((x) => x.id === currentId);
    if (idx < 0) return ordered[0] ?? null;
    return ordered[idx + 1] ?? null;
  }

  // ---------- GOALS ----------
  function scopedGoalsByPosition(): Goal[] {
    if (typeof modeId !== "number") return [];
    return sortByPosition(
      goals.filter((g) => g.modeId === modeId && !g.isCompleted)
    );
  }

  // ---------- PROJECTS ----------
  function scopedProjectsByPosition(): Project[] {
    if (typeof modeId !== "number") return [];
    const base = tasksWithLinks.filter(
      (t) => t.modeId === modeId && !t.isCompleted
    );

    if (milestoneId != null) {
      return sortByPosition(base.filter((t) => t.milestoneId === milestoneId));
    }

    if (projectId != null) {
      return sortByPosition(
        base.filter((t) => t.projectId === projectId && t.milestoneId == null)
      );
    }

    if (goalId != null) {
      return sortByPosition(
        base.filter(
          (t) =>
            t.goalId === goalId && t.projectId == null && t.milestoneId == null
        )
      );
    }

    return sortByPosition(
      base.filter(
        (t) => t.goalId == null && t.projectId == null && t.milestoneId == null
      )
    );
  }

  // ---------- MILESTONES ----------
  function scopedMilestonesByPosition(): Milestone[] {
    if (typeof modeId !== "number") return [];

    const base = milestones.filter(
      (m) => m.modeId === modeId && !m.isCompleted
    );

    // Lane is: siblings under same parent milestone (if nested),
    // else project lane, else goal lane, else mode-root lane.
    if (milestoneId != null) {
      const current = milestonesById.get(milestoneId) ?? null;
      const parentId = current?.parentId ?? null;
      if (parentId != null) {
        return sortByPosition(base.filter((m) => m.parentId === parentId));
      }
    }

    if (projectId != null) {
      return sortByPosition(
        base.filter((m) => m.projectId === projectId && m.parentId == null)
      );
    }

    if (goalId != null) {
      return sortByPosition(
        base.filter(
          (m) =>
            m.goalId === goalId && m.projectId == null && m.parentId == null
        )
      );
    }

    return sortByPosition(
      base.filter(
        (m) => m.goalId == null && m.projectId == null && m.parentId == null
      )
    );
  }

  // ---------- TASKS ----------
  function scopedTasksByPosition(): Task[] {
    if (typeof modeId !== "number") return [];

    const base = tasks.filter((t) => t.modeId === modeId && !t.isCompleted);

    if (milestoneId != null) {
      return sortByPosition(
        base.filter((t) => (t as any).milestoneId === milestoneId)
      );
    }

    if (projectId != null) {
      return sortByPosition(
        base.filter(
          (t) =>
            (t as any).projectId === projectId && (t as any).milestoneId == null
        )
      );
    }

    if (goalId != null) {
      return sortByPosition(
        base.filter(
          (t) =>
            (t as any).goalId === goalId &&
            (t as any).projectId == null &&
            (t as any).milestoneId == null
        )
      );
    }

    return sortByPosition(
      base.filter(
        (t) =>
          (t as any).goalId == null &&
          (t as any).projectId == null &&
          (t as any).milestoneId == null
      )
    );
  }
  function clearForType(t: EntityType) {
    if (t === "task") {
      setTaskId(null);
      return;
    }
    if (t === "milestone") {
      setMilestoneId(null);
      setTaskId(null);
      return;
    }
    if (t === "project") {
      setProjectId(null);
      setMilestoneId(null);
      setTaskId(null);
      return;
    }
    if (t === "goal") setGoalId(null);
    setProjectId(null);
    setMilestoneId(null);
    setTaskId(null);
  }

  function handleNext() {
    const target = getDeepestEntity({ taskId, milestoneId, projectId, goalId });
    if (!target) return;

    if (target.entityType === "task") {
      const ordered = scopedTasksByPosition();
      const next = nextAfter(ordered, target.entityId);
      if (!next) return clearForType("task");
      setTaskId(next.id);
      return;
    }

    if (target.entityType === "milestone") {
      const ordered = scopedMilestonesByPosition();
      const next = nextAfter(ordered, target.entityId);
      if (!next) return clearForType("milestone");
      setMilestoneId(next.id);
      setTaskId(null);
      return;
    }

    if (target.entityType === "project") {
      const ordered = scopedProjectsByPosition();
      const next = nextAfter(ordered, target.entityId);
      if (!next) return clearForType("project");
      setProjectId(next.id);
      setMilestoneId(null);
      setTaskId(null);
      return;
    }

    // goal
    const ordered = scopedGoalsByPosition();
    const next = nextAfter(ordered, target.entityId);
    if (!next) return clearForType("goal");
    setGoalId(next.id);
    setProjectId(null);
    setMilestoneId(null);
    setTaskId(null);
  }
  // Normalise active.path → SelectionLike in camelCase
  const selectionFromPath = useMemo<SelectionLike | null>(() => {
    if (!active) return null;

    // Pick a sensible mode id baseline for normalisation
    const resolvedModeId =
      typeof activeSessionModeId === "number"
        ? activeSessionModeId
        : typeof modeId === "number"
        ? modeId
        : modes[0]?.id ?? 0;

    return normalizePathIdsToSelection(pathIds, resolvedModeId);
  }, [active, activeSessionModeId, modeId, modes, pathIds]);

  function applyTaskPathNormalized(path: {
    modeId: number | null;
    goalId: number | null;
    projectId: number | null;
    milestoneId: number | null;
    taskId: number | null;
  }) {
    let next = { ...path };

    // If we have a task, derive missing parents from the task + effective lineage
    if (next.taskId != null) {
      const t = taskById.get(next.taskId);
      if (t) {
        const tMsId = t.milestoneId ?? null;
        const tPrId = t.projectId ?? null;
        const tGoId = t.goalId ?? null;

        const msId = next.milestoneId ?? tMsId ?? null;
        let prId = next.projectId ?? tPrId ?? null;
        let goId = next.goalId ?? tGoId ?? null;

        if (msId != null) {
          const eff = milestoneEffectiveLineage(
            msId,
            milestonesById,
            projectsById
          );
          prId = prId ?? eff.projectId ?? null;
          goId = goId ?? eff.goalId ?? null;
        } else if (prId != null) {
          const eff = projectEffectiveLineage(prId, projectsById);
          goId = goId ?? eff.goalId ?? null;
        }

        next = { ...next, milestoneId: msId, projectId: prId, goalId: goId };
      }
    }

    // ✅ atomic write (prevents restore/sanitise races)
    useTimerSelectionStore.getState().setRaw({
      modeId: typeof next.modeId === "number" ? next.modeId : modeId,
      goalId: next.goalId ?? null,
      projectId: next.projectId ?? null,
      milestoneId: next.milestoneId ?? null,
      taskId: next.taskId ?? null,
    });

    // stop the restore effect from immediately “helping”
    skipOneRestoreRef.current = true;
  }
  async function handleComplete() {
    if (!active) return;

    // Always complete the ACTIVE session entity, not dropdown state
    const sel = selectionFromPath ?? {
      modeId,
      goalId,
      projectId,
      milestoneId,
      taskId,
    };

    const target = getDeepestEntity({
      taskId: sel.taskId ?? null,
      milestoneId: sel.milestoneId ?? null,
      projectId: sel.projectId ?? null,
      goalId: sel.goalId ?? null,
    });

    if (!target) return;

    const resp = await completeNextMut.mutateAsync({
      entityType: target.entityType,
      entityId: target.entityId,
    });

    console.log(
      "[handleComplete] completed",
      resp.completed,
      "next",
      resp.next
    );

    // ✅ We only want "load next" behaviour for TASKS
    if (target.entityType !== "task") {
      // For non-tasks: just clear the completed type (no auto-advance)
      clearForType(target.entityType);
      return;
    }

    // ─────────────────────────────────────────────
    // TASK: if backend returns a next.path, apply it
    // but normalise parents from lineage first.
    // ─────────────────────────────────────────────
    const nextPath = resp.next?.path ?? null;

    if (nextPath && typeof nextPath.taskId === "number") {
      let next = {
        modeId: nextPath.modeId ?? modeId,
        goalId: nextPath.goalId ?? null,
        projectId: nextPath.projectId ?? null,
        milestoneId: nextPath.milestoneId ?? null,
        taskId: nextPath.taskId ?? null,
      };

      // Fill missing parents from the task + effective lineage
      const t = taskById.get(next.taskId!);
      if (t) {
        const tMsId = (t as any).milestoneId as number | null | undefined;
        const tPrId = (t as any).projectId as number | null | undefined;
        const tGoId = (t as any).goalId as number | null | undefined;

        let msId = next.milestoneId ?? tMsId ?? null;
        let prId = next.projectId ?? tPrId ?? null;
        let goId = next.goalId ?? tGoId ?? null;

        if (msId != null) {
          const eff = milestoneEffectiveLineage(
            msId,
            milestonesById,
            projectsById
          );
          prId = prId ?? eff.projectId ?? null;
          goId = goId ?? eff.goalId ?? null;
        } else if (prId != null) {
          const eff = projectEffectiveLineage(prId, projectsById);
          goId = goId ?? eff.goalId ?? null;
        }

        next = { ...next, milestoneId: msId, projectId: prId, goalId: goId };
      }

      // ✅ atomic write so no intermediate "None" states
      useTimerSelectionStore.getState().setRaw({
        modeId: typeof next.modeId === "number" ? next.modeId : modeId,
        goalId: next.goalId ?? null,
        projectId: next.projectId ?? null,
        milestoneId: next.milestoneId ?? null,
        taskId: next.taskId ?? null,
      });

      // prevent restore effect from immediately overriding
      skipOneRestoreRef.current = true;

      // (optional) keep snapshot in sync
      if (typeof next.modeId === "number") {
        saveSnapshotForMode(next.modeId, {
          goalId: next.goalId ?? null,
          projectId: next.projectId ?? null,
          milestoneId: next.milestoneId ?? null,
          taskId: next.taskId ?? null,
        });
      }

      return;
    }

    // No next task -> clear just the task selection (keep parents stable)
    setTaskId(null);
  }

  useEffect(() => {
    if (active) setDidCompleteStop(false);
  }, [active]);

  // Save snapshot whenever picks change
  useEffect(() => {
    if (typeof modeId !== "number") return;
    saveSnapshotForMode(modeId, { goalId, projectId, milestoneId, taskId });
  }, [modeId, goalId, projectId, milestoneId, taskId, saveSnapshotForMode]);

  // Reset hydration marker if the active session truly changes
  useEffect(() => {
    if (active?.sessionId && active.sessionId !== hydratedSessionId) {
      markHydratedSession(null);
    }
  }, [active?.sessionId, hydratedSessionId, markHydratedSession]);

  // restore selection after stopping
  useEffect(() => {
    if (active == null && lastStoppedSelRef.current) {
      const sel = lastStoppedSelRef.current;

      useTimerSelectionStore.setState({
        goalId: sel.goalId,
        projectId: sel.projectId,
        milestoneId: sel.milestoneId,
        taskId: sel.taskId,
      });

      if (typeof sel.modeId === "number") {
        saveSnapshotForMode(sel.modeId, {
          goalId: sel.goalId,
          projectId: sel.projectId,
          milestoneId: sel.milestoneId,
          taskId: sel.taskId,
        });
      }

      lastStoppedSelRef.current = null;
    }
  }, [active, saveSnapshotForMode]);

  // Clock type & intent
  const { clockType, setClockType } = useTimerClockType();

  // Countdown local state
  const [cdMin, setCdMin] = useState(25);
  const [cdSec, setCdSec] = useState(0);
  const durationSec = cdMin * 60 + cdSec;

  // sync selection modeId with external page filter
  useEffect(() => {
    if (selectedMode === "All") return;
    if (modeId === selectedMode.id) return;
    setModeId(selectedMode.id);
    // setModeId already clears descendants
  }, [selectedMode, modeId, setModeId]);

  // When leaving "All", ask the outer filter to adopt our dropdown-selected mode once
  const hasAdoptedRef = useRef(false);
  useEffect(() => {
    if (
      selectedMode === "All" &&
      typeof modeId === "number" &&
      !hasAdoptedRef.current &&
      typeof onRequestFilterMode === "function"
    ) {
      onRequestFilterMode(modeId);
      hasAdoptedRef.current = true;
    }
  }, [selectedMode, modeId, onRequestFilterMode]);

  // Baseline + Switch-to-selection
  const [baselineSel, setBaselineSel] = useState<SelectionLike | null>(null);
  const [switchArmed, setSwitchArmed] = useState(false);

  // When active stopwatch changes, baseline is the active path
  // BUT only if we don't already have a baseline for this session.
  // When active stopwatch changes, baseline is the active path
  // BUT only if we don't already have a baseline for this session.
  useEffect(() => {
    if (!active || active.kind !== "stopwatch") {
      setBaselineSel(null);
      setSwitchArmed(false);
      return;
    }

    setSwitchArmed(true);

    setBaselineSel((prev) => {
      // If a baseline is already set (e.g. from handleStart / resume),
      // keep it – that's our "original selection".
      if (prev) return prev;

      // ✅ Prefer the true session mode id; fall back to store modeId only if needed
      const baselineModeId =
        typeof activeSessionModeId === "number"
          ? activeSessionModeId
          : typeof modeId === "number"
          ? modeId
          : null;

      // normalise selection using a guaranteed number, even if placeholder
      const normalized = normalizePathIdsToSelection(
        pathIds,
        baselineModeId ?? 0
      );

      if (typeof baselineModeId === "number") {
        saveSnapshotForMode(baselineModeId, {
          goalId: normalized.goalId,
          projectId: normalized.projectId,
          milestoneId: normalized.milestoneId,
          taskId: normalized.taskId,
        });
      }

      return normalized;
    });
  }, [
    active,
    active?.sessionId,
    active?.startedAt,
    active?.kind,
    modeId,
    activeSessionModeId,
    pathIds,
    saveSnapshotForMode,
  ]);

  // ─────────────────────────────────────────────
  // handle launch selection intents from rail buttons
  // ─────────────────────────────────────────────
  const launchIntent = useTimerUIStore((s) => s.launchSelectionIntent);

  useEffect(() => {
    if (!launchIntent) return;

    const intent = useTimerUIStore.getState().consumeLaunchSelectionIntent();
    if (!intent) return;

    console.log("[useTimerController] consume launchIntent", { intent });

    const sel: SelectionLike = {
      modeId: intent.modeId,
      goalId: intent.goalId ?? null,
      projectId: intent.projectId ?? null,
      milestoneId: intent.milestoneId ?? null,
      taskId: intent.taskId ?? null,
    };

    const selectionStore = useTimerSelectionStore.getState();

    if (sel.taskId != null) {
      // TASK LAUNCH: atomic update
      selectionStore.setRaw({
        modeId: sel.modeId,
        goalId: sel.goalId,
        projectId: sel.projectId,
        milestoneId: sel.milestoneId,
        taskId: sel.taskId,
      });

      saveSnapshotForMode(sel.modeId, {
        goalId: sel.goalId,
        projectId: sel.projectId,
        milestoneId: sel.milestoneId,
        taskId: sel.taskId,
      });

      forceParentsNoneOnceRef.current = null;
    } else {
      // NON-TASK LAUNCH: downstream None policy
      selectionStore.setRaw({
        modeId: sel.modeId,
        goalId: sel.goalId,
        projectId: sel.projectId,
        milestoneId: sel.milestoneId,
        taskId: null,
      });

      saveSnapshotForMode(sel.modeId, {
        goalId: sel.goalId,
        projectId: sel.projectId,
        milestoneId: sel.milestoneId,
        taskId: null,
      });

      // mark which parents should be forced to None on the next restore pass
      forceParentsNoneOnceRef.current =
        sel.milestoneId != null
          ? { clearProject: false, clearMilestone: false, clearTask: true }
          : sel.projectId != null
          ? { clearProject: false, clearMilestone: true, clearTask: true }
          : sel.goalId != null
          ? { clearProject: true, clearMilestone: true, clearTask: true }
          : { clearProject: true, clearMilestone: true, clearTask: true };
    }

    if (active?.sessionId) {
      markHydratedSession(active.sessionId);
    }

    // Explicit baseline: the *current* selection when we launch
    if (active && active.kind === "stopwatch") {
      const baselineModeId =
        typeof activeSessionModeId === "number"
          ? activeSessionModeId
          : sel.modeId;

      const baseline = normalizePathIdsToSelection(pathIds, baselineModeId);

      setBaselineSel(baseline);
      setSwitchArmed(true);
    }

    // Don't let immediate next restore overwrite what we just applied
    skipOneRestoreRef.current = true;

    // Mark that an explicit launch happened
    launchGenerationRef.current += 1;
  }, [
    launchIntent,
    active,
    activeSessionModeId,
    pathIds,
    saveSnapshotForMode,
    markHydratedSession,
  ]);

  // Restore effect: hydrate once from server per session,
  // then prefer snapshots; fill only blanks; normalize parents via lineage.
  useEffect(() => {
    if (skipOneRestoreRef.current) {
      skipOneRestoreRef.current = false;
      return;
    }
    if (modeId == null) return;

    // when there is no active timer, do NOT restore from snapshots.
    if (!active) return;

    // If a launch just happened, let the launch selection "win" once.
    if (launchGenerationRef.current !== lastRestoreSeenLaunchRef.current) {
      lastRestoreSeenLaunchRef.current = launchGenerationRef.current;
      return;
    }

    const isSessionMode =
      active && activeSessionModeId != null && modeId === activeSessionModeId;

    const hydratedAlready =
      Boolean(active?.sessionId) && active?.sessionId === hydratedSessionId;

    const hasPendingLaunchClear = Boolean(forceParentsNoneOnceRef.current);

    // Once this session has been hydrated into this mode,
    // and there's no pending one-shot clear from a launch, stop restoring.
    if (isSessionMode && hydratedAlready && !hasPendingLaunchClear) {
      return;
    }

    const snap = getSnapshotForMode(modeId);

    const fromActivePath: SelectionLike | null = (() => {
      if (!isSessionMode || !active) return null;
      const ids = pathToIdPayload(active.path);
      return normalizePathIdsToSelection(ids, modeId);
    })();

    let src: SelectionLike | null = null;
    if (isSessionMode && !hydratedAlready) {
      src = fromActivePath ?? (snap ? { modeId, ...snap } : null);
      if (active?.sessionId) markHydratedSession(active.sessionId);
    } else {
      src = snap ? { modeId, ...snap } : fromActivePath;
    }
    if (!src) return;

    // one-shot clear policy from last launch
    if (forceParentsNoneOnceRef.current) {
      const { clearProject, clearMilestone, clearTask } =
        forceParentsNoneOnceRef.current;
      src = {
        ...src,
        projectId: clearProject ? null : src.projectId,
        milestoneId: clearMilestone ? null : src.milestoneId,
        taskId: clearTask ? null : src.taskId,
      };
      forceParentsNoneOnceRef.current = null;
    }

    // If src has a task, derive any missing parents from lineage
    if (src.taskId != null) {
      const t = taskById.get(src.taskId);
      if (t) {
        const tMsId = (t as any)?.milestoneId as number | null | undefined;
        const tPrId = (t as any)?.projectId as number | null | undefined;
        const tGoId = (t as any)?.goalId as number | null | undefined;

        let msId = src.milestoneId ?? tMsId ?? null;
        let prId = src.projectId ?? tPrId ?? null;
        let goId = src.goalId ?? tGoId ?? null;

        if (msId != null) {
          const eff = milestoneEffectiveLineage(
            msId,
            milestonesById,
            projectsById
          );
          if (prId == null) prId = eff.projectId ?? null;
          if (goId == null) goId = eff.goalId ?? null;
        } else if (prId != null) {
          const eff = projectEffectiveLineage(prId, projectsById);
          if (goId == null) goId = eff.goalId ?? null;
        }

        src = {
          ...src,
          milestoneId: msId ?? null,
          projectId: prId ?? null,
          goalId: goId ?? null,
        };
      }
    }

    queueMicrotask(() => {
      useTimerSelectionStore.setState((prev) => {
        const targetTaskId = prev.taskId ?? src!.taskId ?? null;
        const targetTask =
          targetTaskId != null ? taskById.get(targetTaskId) : null;

        const tMsId =
          targetTask && typeof (targetTask as any).milestoneId === "number"
            ? (targetTask as any).milestoneId
            : null;
        const tPrId =
          targetTask && typeof (targetTask as any).projectId === "number"
            ? (targetTask as any).projectId
            : null;
        const tGoId =
          targetTask && typeof (targetTask as any).goalId === "number"
            ? (targetTask as any).goalId
            : null;

        const taskIsFlatToProject = Boolean(targetTaskId && tMsId == null);

        const nextMilestoneId =
          prev.milestoneId === null
            ? taskIsFlatToProject
              ? null
              : src!.milestoneId ?? null
            : prev.milestoneId;

        const nextProjectId =
          prev.projectId === null
            ? taskIsFlatToProject
              ? tPrId ?? src!.projectId ?? null
              : src!.projectId ?? null
            : prev.projectId;

        const nextGoalId =
          prev.goalId === null ? src!.goalId ?? tGoId ?? null : prev.goalId;

        const nextTaskId =
          prev.taskId === null ? src!.taskId ?? null : prev.taskId;

        return {
          goalId: nextGoalId,
          projectId: nextProjectId,
          milestoneId: nextMilestoneId,
          taskId: nextTaskId,
        };
      });
    });
  }, [
    modeId,
    active,
    active?.sessionId,
    active?.startedAt,
    activeSessionModeId,
    getSnapshotForMode,
    hydratedSessionId,
    markHydratedSession,
    projectsById,
    milestonesById,
    taskById,
  ]);
  // Use the *visible* mode for diffing, not the raw store modeId.
  // Use the *visible* mode for diffing, not the raw store modeId.
  // Use the *visible* mode for diffing, not the raw store modeId.
  const modeIdForDiff =
    selectedModeForUI === "All"
      ? modeId // "All" view isn't showing the timer UI anyway
      : (selectedModeForUI as Mode).id;

  // Canonicalise a selection using lineage so logically-equivalent paths
  // (e.g. project-only vs project+goal) compare equal.

  const canonicalizeSelection = useCallback(
    (sel: SelectionLike | null): SelectionLike | null => {
      if (!sel) return null;

      let { modeId, goalId, projectId, milestoneId, taskId } = sel;

      const norm = (v: number | null | undefined): number | null =>
        typeof v === "number" ? v : null;

      goalId = norm(goalId);
      projectId = norm(projectId);
      milestoneId = norm(milestoneId);
      taskId = norm(taskId);

      if (taskId != null) {
        const t = taskById.get(taskId);
        if (t) {
          const tMsId = t.milestoneId ?? null;
          const tPrId = t.projectId ?? null;
          const tGoId = t.goalId ?? null;

          const msId = milestoneId ?? tMsId;
          let prId = projectId ?? tPrId;
          let goId = goalId ?? tGoId;

          if (msId != null) {
            const eff = milestoneEffectiveLineage(
              msId,
              milestonesById,
              projectsById
            );
            if (prId == null) prId = norm(eff.projectId);
            if (goId == null) goId = norm(eff.goalId);
          } else if (prId != null) {
            const eff = projectEffectiveLineage(prId, projectsById);
            if (goId == null) goId = norm(eff.goalId);
          }

          return {
            modeId,
            goalId: goId,
            projectId: prId,
            milestoneId: msId,
            taskId,
          };
        }
      }

      if (milestoneId != null) {
        const eff = milestoneEffectiveLineage(
          milestoneId,
          milestonesById,
          projectsById
        );
        const prId = projectId ?? norm(eff.projectId);
        const goId = goalId ?? norm(eff.goalId);
        return {
          modeId,
          goalId: goId,
          projectId: prId,
          milestoneId,
          taskId: taskId ?? null,
        };
      }

      if (projectId != null) {
        const eff = projectEffectiveLineage(projectId, projectsById);
        const goId = goalId ?? norm(eff.goalId);
        return {
          modeId,
          goalId: goId,
          projectId,
          milestoneId: milestoneId ?? null,
          taskId: taskId ?? null,
        };
      }

      return {
        modeId,
        goalId: goalId ?? null,
        projectId: projectId ?? null,
        milestoneId: milestoneId ?? null,
        taskId: taskId ?? null,
      };
    },
    [taskById, milestonesById, projectsById]
  );
  // Raw current selection from the *UI* perspective
  const currentSelRaw: SelectionLike = useMemo(
    () => ({
      modeId: modeIdForDiff,
      goalId,
      projectId,
      milestoneId,
      taskId,
    }),
    [modeIdForDiff, goalId, projectId, milestoneId, taskId]
  );

  const currentSel = useMemo(
    () => canonicalizeSelection(currentSelRaw),
    [currentSelRaw, canonicalizeSelection]
  );
  const baselineSelCanonical = useMemo(
    () => canonicalizeSelection(baselineSel),
    [baselineSel, canonicalizeSelection]
  );

  const canInlineSwitch = Boolean(active && active.kind === "stopwatch");

  const isDirtySelection =
    canInlineSwitch &&
    baselineSelCanonical != null &&
    currentSel != null &&
    !sameSelection(currentSel, baselineSelCanonical);

  const showSwitch = switchArmed && isDirtySelection;

  // ─────────────────────────────────────────────
  // Clean logging: only when showSwitch actually changes
  // ─────────────────────────────────────────────
  const lastShowSwitchRef = useRef<boolean | null>(null);
  useEffect(() => {
    const prev = lastShowSwitchRef.current;
    if (prev === showSwitch && prev !== null) return;

    lastShowSwitchRef.current = showSwitch;

    console.log("[useTimerController] showSwitch state changed", {
      activeKind: active?.kind,
      canInlineSwitch,
      baselineSel,
      baselineSelCanonical,
      currentSel,
      currentSelRaw,
      switchArmed,
      isDirtySelection,
      showSwitch,
    });
  }, [
    showSwitch,
    canInlineSwitch,
    switchArmed,
    currentSel,
    currentSelRaw,
    baselineSel,
    baselineSelCanonical,
    active?.kind,
    isDirtySelection,
  ]);

  async function handleSwitchToSelection() {
    const token = ++commitTokenRef.current;
    const committed = { ...currentSelRaw };

    console.log("[useTimerController] handleSwitchToSelection", {
      committed,
      activeKind: active?.kind,
      clockType,
    });

    // Set baseline to the committed selection (this is now the "original")
    setBaselineSel(committed);
    if (typeof committed.modeId === "number") {
      saveSnapshotForMode(committed.modeId, {
        goalId: committed.goalId,
        projectId: committed.projectId,
        milestoneId: committed.milestoneId,
        taskId: committed.taskId,
      });
    }

    // ─────────────────────────────────────────
    // 1. No active session → just start
    // ─────────────────────────────────────────
    if (!active) {
      if (clockType === "timer" && durationSec <= 0) return;

      await startMut.mutateAsync(
        buildStartPayloadFromSelection(committed, clockType, durationSec)
      );
    }
    // ─────────────────────────────────────────
    // 2. Active stopwatch → ALWAYS start a new session
    //    (stop + start, no retarget)
    // ─────────────────────────────────────────
    else if (active.kind === "stopwatch") {
      // optionally freeze current selection for restore if you care
      // freezeCurrentSelectionForRestore();

      // End current session
      await stopMut.mutateAsync();

      // Start a fresh stopwatch at 0 for the new selection
      await startMut.mutateAsync(
        buildStartPayloadFromSelection(committed, "stopwatch", durationSec)
      );
    }

    // ─────────────────────────────────────────
    // Commit baseline once things have settled
    // ─────────────────────────────────────────
    queueMicrotask(() => {
      if (commitTokenRef.current !== token) return;
      const settled = snapshotCurrentSelection();
      setBaselineSel(settled);
      if (typeof settled.modeId === "number") {
        saveSnapshotForMode(settled.modeId, {
          goalId: settled.goalId,
          projectId: settled.projectId,
          milestoneId: settled.milestoneId,
          taskId: settled.taskId,
        });
      }
    });

    requestAnimationFrame(() => {
      if (commitTokenRef.current !== token) return;
      const settled = snapshotCurrentSelection();
      setBaselineSel(settled);
      if (typeof settled.modeId === "number") {
        saveSnapshotForMode(settled.modeId, {
          goalId: settled.goalId,
          projectId: settled.projectId,
          milestoneId: settled.milestoneId,
          taskId: settled.taskId,
        });
      }
    });
  }

  // Breadcrumbs: prefer hook result, but fall back to a stable selection
  // derived from the active path, independent of the current mode filter.
  const { leafTitle: rawLeafTitle, ancestors } = useTimerBreadcrumbs({
    active,
    modes,
    goals,
    projects,
    milestones,
    tasks,
  });

  // Derive a leaf title from the normalised selection + global entities.
  const leafTitleFromIds = useMemo(() => {
    if (!selectionFromPath) return null;

    const {
      taskId,
      milestoneId,
      projectId,
      goalId,
      modeId: selModeId,
    } = selectionFromPath;

    if (taskId != null) {
      const t = tasks.find((x) => x.id === taskId);
      if (t) return t.title;
    }

    if (milestoneId != null) {
      const m = milestones.find((x) => x.id === milestoneId);
      if (m) return m.title;
    }

    if (projectId != null) {
      const p = projects.find((x) => x.id === projectId);
      if (p) return p.title;
    }

    if (goalId != null) {
      const g = goals.find((x) => x.id === goalId);
      if (g) return g.title;
    }

    if (selModeId != null) {
      const m = modes.find((x) => x.id === selModeId);
      if (m) return m.title;
    }

    return null;
  }, [selectionFromPath, tasks, milestones, projects, goals, modes]);

  const lastLeafTitleRef = useRef<string | null>(null);

  useEffect(() => {
    if (leafTitleFromIds) lastLeafTitleRef.current = leafTitleFromIds;
  }, [leafTitleFromIds]);

  const leafTitle =
    rawLeafTitle ||
    leafTitleFromIds ||
    lastLeafTitleRef.current ||
    (clockType === "timer" ? "Timer" : "Stopwatch");

  console.log("[useTimerController] breadcrumb debug", {
    activeKind: active?.kind,
    pathIds,
    selectionFromPath,
    rawLeafTitle,
    leafTitleFromIds,
    finalLeafTitle: leafTitle,
  });

  const remainingLive = (() => {
    if (!active) return null;

    const a = active as unknown as Record<string, unknown>;

    const rem = a["remainingSeconds"];
    if (typeof rem === "number") {
      return Math.max(
        0,
        Math.ceil(rem - (Date.now() - (dataUpdatedAt ?? Date.now())) / 1000)
      );
    }

    const endsAt = a["endsAt"];
    if (typeof endsAt === "string" && endsAt.length > 0) {
      return Math.max(
        0,
        Math.ceil(Date.parse(endsAt) / 1000 - Date.now() / 1000)
      );
    }

    return null;
  })();

  const didAutoStopRef = useRef(false);

  useEffect(() => {
    if (!active || active.kind !== "timer") {
      didAutoStopRef.current = false;
      return;
    }
    if (typeof remainingLive !== "number") return;

    if (remainingLive <= 0 && !didAutoStopRef.current) {
      didAutoStopRef.current = true;
      stopMut.mutate(); // or stopMut.mutateAsync() if you want to await
    }
  }, [active, remainingLive, stopMut]);

  // stop/start handlers
  function freezeCurrentSelectionForRestore() {
    if (typeof modeId === "number") {
      saveSnapshotForMode(modeId, { goalId, projectId, milestoneId, taskId });
    }
    skipOneRestoreRef.current = true;
    markHydratedSession(null);
  }

  async function handleStart() {
    if (clockType === "timer" && durationSec <= 0) return;
    await startMut.mutateAsync(
      buildStartPayloadFromSelection(
        { modeId, goalId, projectId, milestoneId, taskId },
        clockType,
        durationSec
      )
    );
    if (clockType === "stopwatch") {
      const snap = { goalId, projectId, milestoneId, taskId };
      setBaselineSel({ modeId, ...snap });
      setSwitchArmed(true);
      if (typeof modeId === "number") {
        saveSnapshotForMode(modeId, snap);
      }
    }
  }

  function handleStop() {
    if (completingRef.current) {
      console.log("[useTimerController] handleStop ignored (completing)");
      return;
    }

    lastStoppedSelRef.current = {
      modeId,
      goalId,
      projectId,
      milestoneId,
      taskId,
    };
    freezeCurrentSelectionForRestore();

    useTimerSelectionStore.setState({ goalId, projectId, milestoneId, taskId });
    skipOneRestoreRef.current = true;

    stopMut.mutate();
  }

  // resume-from-entry
  const { handleResumeFromEntry, resolvePlannedSeconds } =
    useTimerResumeFromEntry({
      tasks,
      modeId,
      startMut,
      setBaselineSel,
    });

  const isAllMode = selectedMode === "All";

  return {
    // data
    active,
    entries,
    now,
    // clock mode
    clockType,
    setClockType,
    // mode + colours
    isAllMode,
    selectedModeForUI,
    modeColor,
    // selection
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
    // switch-to-selection
    showSwitch,
    handleSwitchToSelection,
    // actions
    handleStart,
    handleStop,
    handleResumeFromEntry,
    resolvePlannedSeconds,
    fetchedAtMs: dataUpdatedAt ?? undefined,
    handleComplete,
    handleNext,
    isCompleting: completeNextMut.isPending,
    didCompleteStop,
  };
}
