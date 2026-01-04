// lib/stores/useViewerStore.ts
import { create } from "zustand";

type EntityType = "task" | "milestone" | "project" | "goal";

type ViewerContext =
  | { type: "mode"; modeId: number }
  | { type: "entity"; entity: EntityType; entityId: number };

interface ViewerStore {
  isOpen: boolean;
  context: ViewerContext | null;
  activePinId?: number;
  openViewer: (context: ViewerContext, pinId?: number) => void;
  closeViewer: () => void;
  setActivePinId: (pinId?: number) => void;
}

export const useViewerStore = create<ViewerStore>((set) => ({
  isOpen: false,
  context: null,
  activePinId: undefined,
  openViewer: (context, pinId) =>
    set({ isOpen: true, context, activePinId: pinId }),
  closeViewer: () =>
    set({ isOpen: false, context: null, activePinId: undefined }),
  setActivePinId: (pinId) => set({ activePinId: pinId }),
}));
