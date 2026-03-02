import { create } from "zustand";

type EntityKind = "task" | "milestone" | "project" | "goal";

type SelectionStore = {
  selected: Record<EntityKind, Set<number>>;
  isActive: boolean;

  toggle: (type: EntityKind, id: number) => void;
  add: (type: EntityKind, id: number) => void;
  remove: (type: EntityKind, id: number) => void;
  clearAll: () => void;
  isSelected: (type: EntityKind, id: number) => boolean;
  totalCount: () => number;
  getSelectedIds: () => Record<EntityKind, number[]>;
};

const emptySelection = (): Record<EntityKind, Set<number>> => ({
  task: new Set(),
  milestone: new Set(),
  project: new Set(),
  goal: new Set(),
});

export const useSelectionStore = create<SelectionStore>((set, get) => ({
  selected: emptySelection(),
  isActive: false,

  toggle: (type, id) =>
    set((s) => {
      const next = { ...s.selected, [type]: new Set(s.selected[type]) };
      if (next[type].has(id)) {
        next[type].delete(id);
      } else {
        next[type].add(id);
      }
      const total = Object.values(next).reduce((a, b) => a + b.size, 0);
      return { selected: next, isActive: total > 0 };
    }),

  add: (type, id) =>
    set((s) => {
      const next = { ...s.selected, [type]: new Set(s.selected[type]) };
      next[type].add(id);
      return { selected: next, isActive: true };
    }),

  remove: (type, id) =>
    set((s) => {
      const next = { ...s.selected, [type]: new Set(s.selected[type]) };
      next[type].delete(id);
      const total = Object.values(next).reduce((a, b) => a + b.size, 0);
      return { selected: next, isActive: total > 0 };
    }),

  clearAll: () => set({ selected: emptySelection(), isActive: false }),

  isSelected: (type, id) => get().selected[type].has(id),

  totalCount: () =>
    Object.values(get().selected).reduce((a, b) => a + b.size, 0),

  getSelectedIds: () => ({
    task: [...get().selected.task],
    milestone: [...get().selected.milestone],
    project: [...get().selected.project],
    goal: [...get().selected.goal],
  }),
}));
