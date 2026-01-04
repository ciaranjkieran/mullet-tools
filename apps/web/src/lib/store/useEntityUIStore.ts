// lib/store/useEntityUIStore.ts
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CollapsibleKind = "milestone" | "project" | "goal";

type CollapseState = Record<number, boolean>;
type CollapseByKind = Record<CollapsibleKind, CollapseState>;

type EntityUIState = {
  collapsed: CollapseByKind;

  isCollapsed: (
    kind: CollapsibleKind,
    id: number | null | undefined
  ) => boolean;

  setCollapsed: (kind: CollapsibleKind, id: number, value: boolean) => void;
  toggleCollapsed: (kind: CollapsibleKind, id: number) => void;

  collapseMany: (kind: CollapsibleKind, ids: number[]) => void;
  expandMany: (kind: CollapsibleKind, ids: number[]) => void;
  collapseAllExcept: (
    kind: CollapsibleKind,
    idsInScope: number[],
    exceptId?: number
  ) => void;
  collapseAll: (kind: CollapsibleKind, idsInScope: number[]) => void;

  resetAll: () => void;
};

const makeEmpty = (): CollapseByKind => ({
  milestone: {},
  project: {},
  goal: {},
});

export const useEntityUIStore = create<EntityUIState>()(
  persist(
    (set, get) => ({
      collapsed: makeEmpty(),

      // ⭐️ Defensive: gracefully handle invalid ids
      isCollapsed: (kind, id) =>
        typeof id === "number" && id > 0
          ? !!get().collapsed[kind]?.[id]
          : false,

      setCollapsed: (kind, id, value) =>
        set((s) => ({
          collapsed: {
            ...s.collapsed,
            [kind]: { ...(s.collapsed[kind] || {}), [id]: value },
          },
        })),

      toggleCollapsed: (kind, id) =>
        set((s) => {
          const cur = !!s.collapsed[kind]?.[id];
          return {
            collapsed: {
              ...s.collapsed,
              [kind]: { ...(s.collapsed[kind] || {}), [id]: !cur },
            },
          };
        }),

      collapseMany: (kind, ids) =>
        set((s) => {
          const next = { ...(s.collapsed[kind] || {}) };
          ids.forEach((id) => (next[id] = true));
          return { collapsed: { ...s.collapsed, [kind]: next } };
        }),

      expandMany: (kind, ids) =>
        set((s) => {
          const next = { ...(s.collapsed[kind] || {}) };
          ids.forEach((id) => (next[id] = false));
          return { collapsed: { ...s.collapsed, [kind]: next } };
        }),

      collapseAllExcept: (kind, idsInScope, exceptId) =>
        set((s) => {
          const next = { ...(s.collapsed[kind] || {}) };
          idsInScope.forEach((id) => (next[id] = id !== (exceptId ?? -1)));
          return { collapsed: { ...s.collapsed, [kind]: next } };
        }),

      collapseAll: (kind, idsInScope) =>
        set((s) => {
          const next = { ...(s.collapsed[kind] || {}) };
          idsInScope.forEach((id) => (next[id] = true));
          return { collapsed: { ...s.collapsed, [kind]: next } };
        }),

      // ⭐️ Fresh object so persist sees a change
      resetAll: () => set({ collapsed: makeEmpty() }),
    }),
    { name: "mullet-entity-ui" }
  )
);
