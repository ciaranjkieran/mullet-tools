import { create } from "zustand";

type BoardViewFilter = "all" | "mode-only" | "by-entity";

interface BoardStore {
  // State
  activePinId: string | null;
  boardViewFilter: BoardViewFilter;
  selectedPinIds: string[];
  buildPinDialogOpen: boolean;

  // Actions
  setActivePin: (id: string | null) => void;
  setBoardViewFilter: (filter: BoardViewFilter) => void;

  selectPin: (id: string) => void;
  deselectPin: (id: string) => void;
  clearSelectedPins: () => void;

  setBuildPinDialogOpen: (open: boolean) => void;

  // 🔥 Reset
  reset: () => void;
}

/* ---------------------------------- */
/* Initial state (single source of truth) */
/* ---------------------------------- */

const initialState = {
  activePinId: null,
  boardViewFilter: "all" as BoardViewFilter,
  selectedPinIds: [] as string[],
  buildPinDialogOpen: false,
};

/* ---------------------------------- */
/* Store                              */
/* ---------------------------------- */

export const useBoardStore = create<BoardStore>((set) => ({
  ...initialState,

  setActivePin: (id) => set({ activePinId: id }),

  setBoardViewFilter: (filter) => set({ boardViewFilter: filter }),

  selectPin: (id) =>
    set((state) => ({
      selectedPinIds: [...new Set([...state.selectedPinIds, id])],
    })),

  deselectPin: (id) =>
    set((state) => ({
      selectedPinIds: state.selectedPinIds.filter((pinId) => pinId !== id),
    })),

  clearSelectedPins: () => set({ selectedPinIds: [] }),

  setBuildPinDialogOpen: (open) => set({ buildPinDialogOpen: open }),

  // 🔥 Reset everything back to a clean, unauthenticated state
  reset: () => set(initialState),
}));
