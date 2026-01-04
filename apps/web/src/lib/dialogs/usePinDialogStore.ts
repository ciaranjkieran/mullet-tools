"use client";

import { create } from "zustand";

export type EntityType = "mode" | "task" | "milestone" | "project" | "goal";

type OpenArgs = {
  modeId: number;
  entity: EntityType;
  entityId: number;
  modeColor: string; // ✅ NEW
};

type State = {
  isOpen: boolean;
  modeId: number | null;
  entity: EntityType | null;
  entityId: number | null;
  modeColor: string | null; // ✅ NEW
  open: (args: OpenArgs) => void;
  close: () => void;
};

export const usePinDialogStore = create<State>((set) => ({
  isOpen: false,
  modeId: null,
  entity: null,
  entityId: null,
  modeColor: null, // ✅ NEW
  open: ({ modeId, entity, entityId, modeColor }) =>
    set({ isOpen: true, modeId, entity, entityId, modeColor }),
  close: () =>
    set({
      isOpen: false,
      modeId: null,
      entity: null,
      entityId: null,
      modeColor: null,
    }),
}));
