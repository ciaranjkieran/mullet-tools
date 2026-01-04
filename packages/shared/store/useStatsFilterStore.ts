// @shared/store/useStatsFilterStore.ts
import { create } from "zustand";

export type StatsRange = {
  from: string; // "YYYY-MM-DD"
  to: string; // "YYYY-MM-DD"
  preset?: "today" | "thisWeek" | "thisMonth" | "allTime" | "custom";
};

export type ModeIdFilter = number | "All";

type StatsFilterState = {
  modeId: ModeIdFilter;
  range: StatsRange;

  setModeId: (modeId: ModeIdFilter) => void;
  setRange: (range: StatsRange) => void;

  // 🔥 reset
  reset: () => void;
};

/* ---------------------------------- */
/* Helpers                            */
/* ---------------------------------- */

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function defaultRange(): StatsRange {
  const today = todayISO();
  return { from: today, to: today, preset: "today" };
}

/* ---------------------------------- */
/* Initial state                      */
/* ---------------------------------- */

const initialState = {
  modeId: "All" as ModeIdFilter,
  range: defaultRange(),
};

/* ---------------------------------- */
/* Store                              */
/* ---------------------------------- */

export const useStatsFilterStore = create<StatsFilterState>((set) => ({
  ...initialState,

  setModeId: (modeId) => set({ modeId }),
  setRange: (range) => set({ range }),

  reset: () => set(initialState),
}));
