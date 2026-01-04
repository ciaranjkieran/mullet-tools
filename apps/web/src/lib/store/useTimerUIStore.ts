// lib/store/useTimerUIStore.ts
import { create } from "zustand";

export type ClockType = "stopwatch" | "timer";

type LaunchSelection = {
  modeId: number;
  goalId: number | null;
  projectId: number | null;
  milestoneId: number | null;
  taskId: number | null;
};

type TimerUIState = {
  /** Current clock the UI should display/use */
  clockType: ClockType;
  setClockType: (t: ClockType) => void;

  /** Optional page-level mode filter */
  modeFilterId: number | -1 | null;
  setModeFilterId: (id: number | -1 | null) => void;

  /** One-shot selection intent consumed by TimerView on mount */
  launchSelectionIntent: { sel: LaunchSelection; ts: number } | null;
  setLaunchSelectionIntent: (sel: LaunchSelection) => void;
  consumeLaunchSelectionIntent: () => LaunchSelection | null;

  /** One-shot clock intent to prevent TimerView rehydration from overriding */
  clockTypeIntent: { value: ClockType; ts: number } | null;
  setClockTypeIntent: (value: ClockType) => void;
  consumeClockTypeIntent: () => ClockType | null;

  // 🔥 reset
  reset: () => void;
};

const initialState = {
  clockType: "stopwatch" as ClockType,
  modeFilterId: -1 as number | -1 | null,
  launchSelectionIntent: null as { sel: LaunchSelection; ts: number } | null,
  clockTypeIntent: null as { value: ClockType; ts: number } | null,
};

export const useTimerUIStore = create<TimerUIState>((set, get) => ({
  ...initialState,

  setClockType: (t) => set({ clockType: t }),

  setModeFilterId: (id) => set({ modeFilterId: id }),

  setLaunchSelectionIntent: (sel) =>
    set({ launchSelectionIntent: { sel, ts: Date.now() } }),

  consumeLaunchSelectionIntent: () => {
    const cur = get().launchSelectionIntent;
    if (!cur) return null;
    set({ launchSelectionIntent: null });
    return cur.sel;
  },

  setClockTypeIntent: (value) =>
    set({ clockTypeIntent: { value, ts: Date.now() } }),

  consumeClockTypeIntent: () => {
    const cur = get().clockTypeIntent;
    if (!cur) return null;
    set({ clockTypeIntent: null });
    return cur.value;
  },

  reset: () => set({ ...initialState }),
}));
