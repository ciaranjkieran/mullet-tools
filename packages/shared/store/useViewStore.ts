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

  // 🔥 reset
  reset: () => void;
};

const initialState = {
  viewType: "dashboard" as ViewType,
};

export const useViewStore = create<ViewState>((set) => ({
  ...initialState,

  setViewType: (view) => set({ viewType: view }),

  reset: () => set({ ...initialState }),
}));
