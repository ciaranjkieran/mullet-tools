// lib/store/useNavFocusStore.ts
import { create } from "zustand";

export type FocusKind = "task" | "milestone" | "project" | "goal";

export type FocusTarget = {
  kind: FocusKind;
  id: number;
  /** Tab to select before revealing */
  modeId?: number;
  /** Bumped per request so effects re-run even for same id */
  nonce: number;
};

type NavFocusState = {
  /** One-shot focus intent. Home should clear it after successful reveal. */
  target: FocusTarget | null;

  /** Set a new focus intent (nonce auto-filled). */
  setTarget: (t: Omit<FocusTarget, "nonce">) => void;

  /** Clear the current target (call after you successfully scrolled). */
  clearTarget: () => void;

  /** Optional: current high-level view if you want to use it */
  activeView:
    | "dashboard"
    | "calendar"
    | "comments"
    | "notes"
    | "boards"
    | "templates"
    | "stats"
    | "other";
  setActiveView: (v: NavFocusState["activeView"]) => void;

  /** Which mode tab should be selected */
  activeModeId: number | null;
  setActiveModeId: (id: number | null) => void;
};

let _nonce = 1;

export const useHomeFocusStore = create<NavFocusState>((set) => ({
  target: null,

  setTarget: (t) => set({ target: { ...t, nonce: _nonce++ } }),

  clearTarget: () => set({ target: null }),

  activeView: "dashboard",
  setActiveView: (v) => set({ activeView: v }),

  activeModeId: null,
  setActiveModeId: (id) => set({ activeModeId: id }),
}));
