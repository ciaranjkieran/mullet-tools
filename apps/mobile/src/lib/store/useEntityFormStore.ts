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
  defaultDate: string | null;
  initialTab: string | null;

  openCreate: (type: EntityFormType, opts?: { defaultDate?: string }) => void;
  openEdit: (type: EntityFormType, entity: Goal | Project | Milestone | Task, opts?: { tab?: string }) => void;
  close: () => void;
  reset: () => void;
}

export const useEntityFormStore = create<EntityFormStore>((set) => ({
  visible: false,
  entityType: "task",
  editEntity: null,
  defaultModeId: null,
  defaultDate: null,
  initialTab: null,

  openCreate: (type, opts) =>
    set({ visible: true, entityType: type, editEntity: null, initialTab: null, defaultDate: opts?.defaultDate ?? null }),

  openEdit: (type, entity, opts) =>
    set({ visible: true, entityType: type, editEntity: entity, initialTab: opts?.tab ?? null }),

  close: () => set({ visible: false, editEntity: null, initialTab: null, defaultDate: null }),

  reset: () =>
    set({ visible: false, entityType: "task", editEntity: null, defaultModeId: null, defaultDate: null, initialTab: null }),
}));
