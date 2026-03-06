import { create } from "zustand";

export type LaunchSelection = {
  modeId: number;
  goalId: number | null;
  projectId: number | null;
  milestoneId: number | null;
  taskId: number | null;
};

type TimerLaunchState = {
  launchIntent: { sel: LaunchSelection; ts: number } | null;
  setLaunchIntent: (sel: LaunchSelection) => void;
  consumeLaunchIntent: () => LaunchSelection | null;
};

export const useTimerLaunchStore = create<TimerLaunchState>((set, get) => ({
  launchIntent: null,
  setLaunchIntent: (sel) => set({ launchIntent: { sel, ts: Date.now() } }),
  consumeLaunchIntent: () => {
    const intent = get().launchIntent;
    if (!intent) return null;
    set({ launchIntent: null });
    return intent.sel;
  },
}));
