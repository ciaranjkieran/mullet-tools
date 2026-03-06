// @shared/ui/timer/useTimerIntentStore.ts
import { create } from "zustand";
import type { TimerPath } from "@shared/lineage/toTimerPath";

export type { TimerPath };

type State = {
  pendingPath: TimerPath | null;
  clearOnUse: boolean; // if true, the timer view should clear it after consuming
  setIntent: (path: TimerPath, opts?: { clearOnUse?: boolean }) => void;
  clear: () => void;
};

export const useTimerIntentStore = create<State>((set) => ({
  pendingPath: null,
  clearOnUse: true,
  setIntent: (path, opts) =>
    set({
      pendingPath: path,
      clearOnUse: opts?.clearOnUse ?? true,
    }),
  clear: () => set({ pendingPath: null }),
}));
