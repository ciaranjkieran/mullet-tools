import { create } from "zustand";
import type { Goal } from "@shared/types/Goal";
import type { Project } from "@shared/types/Project";
import type { Milestone } from "@shared/types/Milestone";
import type { Task } from "@shared/types/Task";

export type EntityFormType = "goal" | "project" | "milestone" | "task";

interface EntityFormStore {
  visible: boolean;
  entityType: EntityFormType;
  editEntity: Goal | Project | Milestone | Task | null;
  defaultModeId: number | null;

  openCreate: (type: EntityFormType) => void;
  openEdit: (type: EntityFormType, entity: Goal | Project | Milestone | Task) => void;
  close: () => void;
  reset: () => void;
}

export const useEntityFormStore = create<EntityFormStore>((set) => ({
  visible: false,
  entityType: "task",
  editEntity: null,
  defaultModeId: null,

  openCreate: (type) =>
    set({ visible: true, entityType: type, editEntity: null }),

  openEdit: (type, entity) =>
    set({ visible: true, entityType: type, editEntity: entity }),

  close: () => set({ visible: false, editEntity: null }),

  reset: () =>
    set({ visible: false, entityType: "task", editEntity: null, defaultModeId: null }),
}));
