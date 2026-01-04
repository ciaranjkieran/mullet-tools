// lib/store/useGoalStore.ts

import { create } from "zustand";
import type { Goal } from "@shared/types/Goal";

interface GoalStore {
  goals: Goal[];
  selectedGoalIds: number[];

  setGoals: (goals: Goal[]) => void;
  addGoal: (goal: Goal) => void;
  updateGoal: (goal: Goal) => void;
  deleteGoal: (id: number) => void;

  toggleSelection: (id: number) => void;
  clearSelection: () => void;

  // Optimistic DnD helpers
  moveGoalToDate: (goalId: number, newDate: string | null) => void;
  updateGoalPositionsLocally: (
    changes: { id: number; position: number }[]
  ) => void;

  // 🔥 Reset
  reset: () => void;
}

/* ---------------------------------- */
/* Initial state                      */
/* ---------------------------------- */

const initialState = {
  goals: [] as Goal[],
  selectedGoalIds: [] as number[],
};

/* ---------------------------------- */
/* Store                              */
/* ---------------------------------- */

export const useGoalStore = create<GoalStore>((set) => ({
  ...initialState,

  // When we replace the goals list from the server,
  // it’s usually safest to also clear selection.
  setGoals: (goals) => set({ goals, selectedGoalIds: [] }),

  addGoal: (goal) => set((s) => ({ goals: [...s.goals, goal] })),

  updateGoal: (goal) =>
    set((s) => ({
      goals: s.goals.map((g) => (g.id === goal.id ? goal : g)),
    })),

  deleteGoal: (id) =>
    set((s) => ({
      goals: s.goals.filter((g) => g.id !== id),
      selectedGoalIds: s.selectedGoalIds.filter((gid) => gid !== id),
    })),

  toggleSelection: (id) =>
    set((s) => ({
      selectedGoalIds: s.selectedGoalIds.includes(id)
        ? s.selectedGoalIds.filter((gid) => gid !== id)
        : [...s.selectedGoalIds, id],
    })),

  clearSelection: () => set({ selectedGoalIds: [] }),

  moveGoalToDate: (goalId, newDate) =>
    set((s) => ({
      goals: s.goals.map((g) =>
        g.id === goalId ? { ...g, dueDate: newDate } : g
      ),
    })),

  updateGoalPositionsLocally: (changes) => {
    const posMap = Object.fromEntries(changes.map((c) => [c.id, c.position]));
    set((s) => ({
      goals: s.goals.map((g) =>
        posMap[g.id] !== undefined ? { ...g, position: posMap[g.id] } : g
      ),
    }));
  },

  reset: () => set(initialState),
}));
