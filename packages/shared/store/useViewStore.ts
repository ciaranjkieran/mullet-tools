// lib/store/useViewStore.ts
import { create } from "zustand";

export type ViewType =
  | "calendar"
  | "dashboard"
  | "comments"
  | "notes"
  | "boards"
  | "templates"
  | "timer"
  | "stats";

type ViewState = {
  viewType: ViewType;
  setViewType: (view: ViewType) => void;

  /** Optional callback registered by DashboardPage to navigate (store + URL). */
  goView: ((view: ViewType) => void) | null;
  setGoView: (fn: ((view: ViewType) => void) | null) => void;

  // 🔥 reset
  reset: () => void;
};

const initialState = {
  viewType: "dashboard" as ViewType,
  goView: null as ((view: ViewType) => void) | null,
};

export const useViewStore = create<ViewState>((set) => ({
  ...initialState,

  setViewType: (view) => set({ viewType: view }),
  setGoView: (fn) => set({ goView: fn }),

  reset: () => set({ ...initialState }),
}));
