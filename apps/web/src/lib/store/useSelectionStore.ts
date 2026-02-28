"use client";

import { create } from "zustand";

export type EntityType = "task" | "milestone" | "project" | "goal";
type SelectedMap = Record<EntityType, Set<number>>;

type SelectionState = {
  selected: SelectedMap;
  lastSelected: { type: EntityType; id: number } | null;

  // basic ops
  isSelected: (type: EntityType, id: number) => boolean;
  toggle: (type: EntityType, id: number) => void;
  add: (type: EntityType, id: number) => void;
  addMany: (items: Array<{ type: EntityType; id: number }>) => void;
  remove: (type: EntityType, id: number) => void;
  setLastSelected: (type: EntityType, id: number) => void;
  clearAll: () => void;

  // derived helpers
  countByType: () => Record<EntityType, number>;
  totalCount: () => number;
  shape: () => { kinds: EntityType[]; singleKind: EntityType | null };
};

function emptySelected(): SelectedMap {
  return {
    task: new Set<number>(),
    milestone: new Set<number>(),
    project: new Set<number>(),
    goal: new Set<number>(),
  };
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selected: emptySelected(),
  lastSelected: null,

  isSelected: (type, id) => {
    const s = get().selected;
    const setForType = s[type];
    return setForType ? setForType.has(id) : false;
  },

  toggle: (type, id) =>
    set((state) => {
      const next = new Set(state.selected[type]);

      if (next.has(id)) next.delete(id);
      else next.add(id);

      return { selected: { ...state.selected, [type]: next } };
    }),

  add: (type, id) =>
    set((state) => {
      const next = new Set(state.selected[type]);
      next.add(id);
      return { selected: { ...state.selected, [type]: next } };
    }),

  addMany: (items) =>
    set((state) => {
      const next = { ...state.selected };
      for (const { type, id } of items) {
        next[type] = new Set(next[type]);
        next[type].add(id);
      }
      return { selected: next };
    }),

  remove: (type, id) =>
    set((state) => {
      const next = new Set(state.selected[type]);
      next.delete(id);
      return { selected: { ...state.selected, [type]: next } };
    }),

  setLastSelected: (type, id) => set({ lastSelected: { type, id } }),

  clearAll: () => set({ selected: emptySelected(), lastSelected: null }),

  countByType: () => {
    const s = get().selected;
    return {
      task: s.task.size,
      milestone: s.milestone.size,
      project: s.project.size,
      goal: s.goal.size,
    };
  },

  totalCount: () => {
    const c = get().countByType();
    return c.task + c.milestone + c.project + c.goal;
  },

  shape: () => {
    const c = get().countByType();
    const kinds = (Object.keys(c) as EntityType[]).filter((k) => c[k] > 0);
    return { kinds, singleKind: kinds.length === 1 ? kinds[0] : null };
  },
}));
