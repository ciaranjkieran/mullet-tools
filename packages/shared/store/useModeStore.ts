import { create } from "zustand";

// Types
export interface Mode {
  id: number;
  title: string;
  color: string;
  position: number;
  isOwned: boolean;
  collaboratorCount: number;
  ownerName: string | null;
}

// Small helpers
const sortModes = (modes: Mode[]) =>
  [...modes].sort(
    (a, b) =>
      (a.position ?? 0) - (b.position ?? 0) ||
      (a.id as number) - (b.id as number)
  );

const normalizePositions = (modes: Mode[]) =>
  modes.map((m, idx) => ({ ...m, position: idx }));

interface ModeStore {
  modes: Mode[];
  selectedMode: Mode | "All";

  // setters
  setModes: (modes: Mode[]) => void;
  addMode: (mode: Mode) => void;
  updateMode: (updated: Mode) => void;
  deleteMode: (id: number) => void;
  setSelectedMode: (mode: Mode | "All") => void;

  // ordering
  reorderModes: (newOrder: Mode[]) => void;
  moveMode: (id: number, delta: number) => void;
  setModePosition: (id: number, pos: number) => void;

  // selectors
  getSortedModes: () => Mode[];

  // 🔥 reset
  reset: () => void;
}

/* ---------------------------------- */
/* Initial state                      */
/* ---------------------------------- */

const initialState = {
  modes: [] as Mode[],
  selectedMode: "All" as const,
};

export const useModeStore = create<ModeStore>((set, get) => ({
  ...initialState,

  setModes: (modes) =>
    set({
      modes: sortModes(modes),
      // ⛑ if modes refresh, keep selection sane
      selectedMode: get().selectedMode === "All" ? "All" : get().selectedMode,
    }),

  addMode: (mode) =>
    set((state) => {
      const next = [...state.modes, mode];
      return { modes: sortModes(next) };
    }),

  updateMode: (updated) =>
    set((state) => {
      const next = state.modes.map((m) =>
        m.id === updated.id ? { ...m, ...updated } : m
      );

      // If selectedMode is a concrete mode, update it too
      const sel = state.selectedMode;
      const nextSelectedMode =
        sel !== "All" && sel.id === updated.id ? { ...sel, ...updated } : sel;

      return { modes: sortModes(next), selectedMode: nextSelectedMode };
    }),

  deleteMode: (id) =>
    set((state) => {
      const next = state.modes.filter((m) => m.id !== id);

      const nextSelectedMode =
        state.selectedMode !== "All" && state.selectedMode.id === id
          ? "All"
          : state.selectedMode;

      return {
        modes: normalizePositions(sortModes(next)),
        selectedMode: nextSelectedMode,
      };
    }),

  setSelectedMode: (mode) => set({ selectedMode: mode }),

  reorderModes: (newOrder) =>
    set({ modes: normalizePositions(sortModes(newOrder)) }),

  moveMode: (id, delta) =>
    set((state) => {
      const idx = state.modes.findIndex((m) => m.id === id);
      if (idx < 0) return {};
      const target = idx + delta;
      if (target < 0 || target >= state.modes.length) return {};
      const next = [...state.modes];
      const [item] = next.splice(idx, 1);
      next.splice(target, 0, item);
      return { modes: normalizePositions(next) };
    }),

  setModePosition: (id, pos) =>
    set((state) => {
      const next = state.modes.map((m) =>
        m.id === id ? { ...m, position: pos } : m
      );
      return { modes: normalizePositions(sortModes(next)) };
    }),

  getSortedModes: () => sortModes(get().modes),

  reset: () => set(initialState),
}));
