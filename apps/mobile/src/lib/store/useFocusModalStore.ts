import { create } from "zustand";
import type { Goal } from "@shared/types/Goal";
import type { Project } from "@shared/types/Project";
import type { Milestone } from "@shared/types/Milestone";

export type FocusEntityType = "goal" | "project" | "milestone";
export type FocusEntity = Goal | Project | Milestone;

interface FocusFrame {
  entityType: FocusEntityType;
  entity: FocusEntity;
  modeColor: string;
  modeId: number;
}

interface FocusModalStore {
  visible: boolean;
  stack: FocusFrame[];

  open: (entityType: FocusEntityType, entity: FocusEntity, modeColor: string, modeId: number) => void;
  pushFocus: (entityType: FocusEntityType, entity: FocusEntity, modeColor: string, modeId: number) => void;
  popFocus: () => void;
  close: () => void;
}

export const useFocusModalStore = create<FocusModalStore>((set, get) => ({
  visible: false,
  stack: [],

  open: (entityType, entity, modeColor, modeId) =>
    set({ visible: true, stack: [{ entityType, entity, modeColor, modeId }] }),

  pushFocus: (entityType, entity, modeColor, modeId) => {
    const { stack } = get();
    // Prevent circular focus
    if (stack.some((f) => f.entityType === entityType && f.entity.id === entity.id)) return;
    set({ stack: [...stack, { entityType, entity, modeColor, modeId }] });
  },

  popFocus: () => {
    const { stack } = get();
    if (stack.length <= 1) {
      set({ visible: false, stack: [] });
    } else {
      set({ stack: stack.slice(0, -1) });
    }
  },

  close: () => set({ visible: false, stack: [] }),
}));
