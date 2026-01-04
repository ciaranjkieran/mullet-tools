"use client";

import { create } from "zustand";
import type { Milestone } from "@shared/types/Milestone";

interface MilestoneStore {
  milestones: Milestone[];

  // selection
  selectedMilestoneIds: number[];
  toggleMilestoneSelection: (id: number) => void;
  clearSelectedMilestones: () => void;
  deselectMilestone: (id: number) => void;

  // queries/helpers
  getChildMilestones: (parentId: number | null) => Milestone[];
  getMilestonesByMode: (modeId: number) => Milestone[];

  // CRUD
  setMilestones: (milestones: Milestone[]) => void;
  addMilestone: (milestone: Milestone) => void;
  updateMilestone: (updated: Milestone) => void;
  deleteMilestone: (id: number) => void;

  // ordering & scheduling
  reorderMilestonesInMode: (modeId: number, newOrderIds: number[]) => void;
  updateMilestonePositionsLocally: (
    updates: { id: number; position: number }[]
  ) => void;
  moveMilestoneToDate: (milestoneId: number, newDate: string | null) => void;

  reorderUnscheduledInParent: (
    parentId: number | null,
    orderedUnscheduledIds: number[]
  ) => void;

  updateMilestoneParent: (id: number, parentId: number | null) => void;

  // 🔥 Reset
  reset: () => void;
}

/* ---------------------------------- */
/* Initial state                      */
/* ---------------------------------- */

const initialState = {
  milestones: [] as Milestone[],
  selectedMilestoneIds: [] as number[],
};

/* ---------------------------------- */
/* Store                              */
/* ---------------------------------- */

export const useMilestoneStore = create<MilestoneStore>((set, get) => ({
  ...initialState,

  // selection
  toggleMilestoneSelection: (id) =>
    set((state) => ({
      selectedMilestoneIds: state.selectedMilestoneIds.includes(id)
        ? state.selectedMilestoneIds.filter((mid) => mid !== id)
        : [...state.selectedMilestoneIds, id],
    })),

  clearSelectedMilestones: () => set({ selectedMilestoneIds: [] }),

  deselectMilestone: (id) =>
    set((state) => ({
      selectedMilestoneIds: state.selectedMilestoneIds.filter(
        (mid) => mid !== id
      ),
    })),

  // CRUD
  setMilestones: (milestones) =>
    set({
      milestones,
      selectedMilestoneIds: [], // ⛑ clear stale selections
    }),

  addMilestone: (milestone) =>
    set((state) => ({
      milestones: [...state.milestones, milestone],
    })),

  updateMilestone: (updated) =>
    set((state) => ({
      milestones: state.milestones.map((m) =>
        m.id === updated.id ? updated : m
      ),
    })),

  deleteMilestone: (id) =>
    set((state) => ({
      milestones: state.milestones.filter((m) => m.id !== id),
      selectedMilestoneIds: state.selectedMilestoneIds.filter(
        (mid) => mid !== id
      ),
    })),

  // queries/helpers
  getChildMilestones: (parentId) =>
    get().milestones.filter((m) => m.parentId === parentId),

  getMilestonesByMode: (modeId) =>
    get().milestones.filter((m) => m.modeId === modeId),

  // ordering & scheduling
  reorderMilestonesInMode: (modeId, newOrderIds) =>
    set((state) => {
      const indexOf = new Map(newOrderIds.map((id, idx) => [id, idx]));
      return {
        milestones: state.milestones.map((m) =>
          m.modeId === modeId && indexOf.has(m.id)
            ? { ...m, position: indexOf.get(m.id)! }
            : m
        ),
      };
    }),

  updateMilestonePositionsLocally: (updates) =>
    set((state) => {
      const map = new Map(updates.map((u) => [u.id, u.position]));
      return {
        milestones: state.milestones.map((m) =>
          map.has(m.id) ? { ...m, position: map.get(m.id)! } : m
        ),
      };
    }),

  moveMilestoneToDate: (milestoneId, newDate) =>
    set((state) => ({
      milestones: state.milestones.map((m) =>
        m.id === milestoneId ? { ...m, dueDate: newDate } : m
      ),
    })),

  reorderUnscheduledInParent: (parentId, orderedUnscheduledIds) =>
    set((state) => {
      const posMap = new Map<number, number>();
      orderedUnscheduledIds.forEach((id, idx) => posMap.set(id, idx));

      return {
        milestones: state.milestones.map((m) => {
          const sameParent = m.parentId === parentId;
          const unscheduled = !m.dueDate;
          if (sameParent && unscheduled && posMap.has(m.id)) {
            return { ...m, position: posMap.get(m.id)! };
          }
          return m;
        }),
      };
    }),

  updateMilestoneParent: (id, parentId) =>
    set((state) => ({
      milestones: state.milestones.map((m) =>
        m.id === id ? { ...m, parentId } : m
      ),
    })),

  reset: () => set(initialState),
}));
