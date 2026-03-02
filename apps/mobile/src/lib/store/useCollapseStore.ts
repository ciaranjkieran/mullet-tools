import { create } from "zustand";

interface CollapseStore {
  collapsed: Record<string, boolean>;
  toggle: (key: string) => void;
  isCollapsed: (key: string) => boolean;
  reset: () => void;
}

export const useCollapseStore = create<CollapseStore>((set, get) => ({
  collapsed: {},
  toggle: (key) =>
    set((s) => ({
      collapsed: { ...s.collapsed, [key]: !s.collapsed[key] },
    })),
  isCollapsed: (key) => !!get().collapsed[key],
  reset: () => set({ collapsed: {} }),
}));
