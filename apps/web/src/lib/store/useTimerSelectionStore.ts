// lib/store/useTimerSelectionStore.ts
import { create } from "zustand";
import {
  persist,
  createJSONStorage,
  type PersistOptions,
} from "zustand/middleware";

type SelId = number | null;

type Snapshot = {
  goalId: SelId;
  projectId: SelId;
  milestoneId: SelId;
  taskId: SelId;
};

type State = {
  modeId: number;
  goalId: SelId;
  projectId: SelId;
  milestoneId: SelId;
  taskId: SelId;
  snapshotsByMode: Record<number, Snapshot | undefined>;
  hydratedSessionId: string | null;
  _hasHydrated: boolean;
};

type Actions = {
  setRaw: (patch: Partial<State>) => void;
  setModeId: (id: number) => void;
  setGoalId: (id: SelId) => void;
  setProjectId: (id: SelId) => void;
  setMilestoneId: (id: SelId) => void;
  setTaskId: (id: SelId) => void;
  setFromProject: (p: { projectId: number; goalId: SelId }) => void;
  setFromMilestone: (p: {
    milestoneId: number;
    projectId: SelId;
    goalId: SelId;
  }) => void;
  saveSnapshotForMode: (modeId: number, snap: Snapshot) => void;
  getSnapshotForMode: (modeId: number) => Snapshot | null;
  markHydratedSession: (sessionId: string | null) => void;
  clearLineage: () => void;
  resetAll: () => void;
};

type Store = State & Actions;

const initial: State = {
  modeId: -1,
  goalId: null,
  projectId: null,
  milestoneId: null,
  taskId: null,
  snapshotsByMode: {},
  hydratedSessionId: null,
  _hasHydrated: false,
};

const KEYS: (keyof State)[] = ["goalId", "projectId", "milestoneId", "taskId"];

function traceClears(
  prev: State,
  next: State | Partial<State>,
  source: string
) {
  try {
    for (const k of KEYS) {
      const had = prev[k] != null;
      const nextVal = (k in next ? (next as State)[k] : prev[k]) as SelId;
      const nowNull = nextVal === null;
      if (had && nowNull) {
        console.trace(`[TimerSelection] ${source}: ${k} cleared`, {
          from: prev[k],
          to: nextVal,
          prev,
          next,
        });
      }
    }
  } catch {}
}

// ✅ Strongly-typed persist options (lets us safely access .persist below)
type TimerPersist = PersistOptions<Store, Partial<Store>>;

export const useTimerSelectionStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initial,

      /**
       * Raw setter used by controller (launch / restore).
       * Important: when a higher-level id (goal/project/milestone) is present,
       * we let that patch fully define (and clear) its descendants.
       */
      setRaw: (patch) => {
        set((prev) => {
          const next: State = { ...prev };

          // modeId (keeps existing "change clears everything" behaviour)
          if ("modeId" in patch && typeof patch.modeId === "number") {
            const changed = prev.modeId !== patch.modeId!;
            next.modeId = patch.modeId!;
            if (changed) {
              next.goalId = null;
              next.projectId = null;
              next.milestoneId = null;
              next.taskId = null;
            }
          }

          // If goalId is present, treat this patch as authoritative for the chain
          if ("goalId" in patch) {
            const newGoal = patch.goalId ?? null;
            next.goalId = newGoal;

            // project/milestone/task come from patch if provided, else null
            if ("projectId" in patch) next.projectId = patch.projectId ?? null;
            else next.projectId = null;

            if ("milestoneId" in patch)
              next.milestoneId = patch.milestoneId ?? null;
            else next.milestoneId = null;

            if ("taskId" in patch) next.taskId = patch.taskId ?? null;
            else next.taskId = null;

            traceClears(prev, next, "setRaw(goalId)");
            return next;
          }

          // If projectId is present (and no goalId), it owns milestone/task
          if ("projectId" in patch) {
            const newProj = patch.projectId ?? null;
            next.projectId = newProj;

            if ("milestoneId" in patch)
              next.milestoneId = patch.milestoneId ?? null;
            else next.milestoneId = null;

            if ("taskId" in patch) next.taskId = patch.taskId ?? null;
            else next.taskId = null;

            traceClears(prev, next, "setRaw(projectId)");
            return next;
          }

          // If milestoneId is present (and no goal/project in patch), it owns task
          if ("milestoneId" in patch) {
            const newMs = patch.milestoneId ?? null;
            next.milestoneId = newMs;

            if ("taskId" in patch) next.taskId = patch.taskId ?? null;
            else next.taskId = null;

            traceClears(prev, next, "setRaw(milestoneId)");
            return next;
          }

          // If only taskId is present, just set it
          if ("taskId" in patch) {
            next.taskId = patch.taskId ?? null;
            traceClears(prev, next, "setRaw(taskId)");
            return next;
          }

          traceClears(prev, next, "setRaw");
          return next;
        });
      },

      setModeId: (id) =>
        set((prev) => {
          const changed = prev.modeId !== id;
          const next: State = {
            ...prev,
            modeId: id,
            ...(changed
              ? {
                  goalId: null,
                  projectId: null,
                  milestoneId: null,
                  taskId: null,
                }
              : {}),
          };
          traceClears(prev, next, "setModeId");
          return next;
        }),

      setGoalId: (id) =>
        set((prev) => {
          const next: State = {
            ...prev,
            goalId: id,
            projectId: null,
            milestoneId: null,
            taskId: null,
          };
          traceClears(prev, next, "setGoalId");
          return next;
        }),

      setProjectId: (id) =>
        set((prev) => {
          const next: State = {
            ...prev,
            projectId: id,
            milestoneId: null,
            taskId: null,
          };
          traceClears(prev, next, "setProjectId");
          return next;
        }),

      setMilestoneId: (id) =>
        set((prev) => {
          const next: State = { ...prev, milestoneId: id, taskId: null };
          traceClears(prev, next, "setMilestoneId");
          return next;
        }),

      setTaskId: (id) =>
        set((prev) => {
          const next: State = { ...prev, taskId: id };
          traceClears(prev, next, "setTaskId");
          return next;
        }),

      setFromProject: ({ projectId, goalId }) =>
        set((prev) => {
          const next: State = {
            ...prev,
            goalId: goalId ?? prev.goalId ?? null,
            projectId,
            milestoneId: null,
            taskId: null,
          };
          traceClears(prev, next, "setFromProject");
          return next;
        }),

      setFromMilestone: ({ milestoneId, projectId, goalId }) =>
        set((prev) => {
          const next: State = {
            ...prev,
            goalId: goalId ?? prev.goalId ?? null,
            projectId: projectId ?? prev.projectId ?? null,
            milestoneId,
            taskId: null,
          };
          traceClears(prev, next, "setFromMilestone");
          return next;
        }),

      saveSnapshotForMode: (modeId, snap) =>
        set((prev) => ({
          snapshotsByMode: { ...prev.snapshotsByMode, [modeId]: { ...snap } },
        })),

      getSnapshotForMode: (modeId) => get().snapshotsByMode[modeId] ?? null,

      markHydratedSession: (sessionId) => set({ hydratedSessionId: sessionId }),

      clearLineage: () =>
        set((prev) => {
          const next: State = {
            ...prev,
            goalId: null,
            projectId: null,
            milestoneId: null,
            taskId: null,
          };
          traceClears(prev, next, "clearLineage");
          return next;
        }),

      resetAll: () =>
        set((prev) => {
          const next: State = { ...initial, _hasHydrated: prev._hasHydrated };
          traceClears(prev, next, "resetAll");
          return next;
        }),
    }),
    {
      name: "timer-selection",
      version: 3,
      storage: createJSONStorage(() => localStorage),

      // ✅ No `any`: accept unknown and return the shape we expect
      migrate: (persisted: unknown) => persisted as Partial<Store>,

      partialize: (s) => ({
        modeId: s.modeId,
        goalId: s.goalId,
        projectId: s.projectId,
        milestoneId: s.milestoneId,
        taskId: s.taskId,
        snapshotsByMode: s.snapshotsByMode,
        hydratedSessionId: s.hydratedSessionId,
      }),
    } satisfies TimerPersist
  )
);

// ✅ No `any`: persist is part of the middleware typing
useTimerSelectionStore.persist.onFinishHydration(() => {
  useTimerSelectionStore.setState({ _hasHydrated: true });
});
