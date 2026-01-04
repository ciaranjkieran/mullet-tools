// @shared/store/useTimerStore.ts
"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { ActiveTimerDTO, StartTimerPayload } from "@shared/types/Timer";

type StartFn = (payload: StartTimerPayload) => Promise<void>;
type StopFn = () => Promise<void>;

type TimerStore = {
  active: ActiveTimerDTO | null;
  setActive: (a: ActiveTimerDTO | null) => void;

  // imperative actions (wired by a binder hook)
  start: StartFn;
  stop: StopFn;
  setActions: (start: StartFn, stop: StopFn) => void;

  // 🔥 reset
  reset: () => void;
};

const placeholderStart: StartFn = async () => {
  console.warn("useTimerStore.start called before actions are bound");
};
const placeholderStop: StopFn = async () => {
  console.warn("useTimerStore.stop called before actions are bound");
};

const initialStatePick = {
  active: null as ActiveTimerDTO | null,
  start: placeholderStart as StartFn,
  stop: placeholderStop as StopFn,
};

export const useTimerStore = create<TimerStore>()(
  devtools((set) => ({
    ...initialStatePick,

    setActive: (a) => set({ active: a }),

    setActions: (start, stop) => set({ start, stop }),

    reset: () => set({ ...initialStatePick }),
  }))
);
