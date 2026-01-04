// @shared/store/useTemplateWorkbenchStore.ts
import { create } from "zustand";
import {
  TemplateMilestoneData,
  TemplateProjectData,
} from "@shared/types/Template";

type Draft =
  | { type: "milestone"; modeId: number; data: TemplateMilestoneData }
  | { type: "project"; modeId: number; data: TemplateProjectData };

type TemplateWorkbenchState = {
  draft: Draft | null;
  isOpen: boolean;

  openWithDraft: (d: Draft) => void;
  close: () => void;
  clear: () => void;

  // 🔥 reset
  reset: () => void;
};

/* ---------------------------------- */
/* Initial state                      */
/* ---------------------------------- */

const initialState = {
  draft: null as Draft | null,
  isOpen: false,
};

/* ---------------------------------- */
/* Store                              */
/* ---------------------------------- */

export const useTemplateWorkbenchStore = create<TemplateWorkbenchState>(
  (set) => ({
    ...initialState,

    openWithDraft: (draft) => set({ draft, isOpen: true }),

    close: () => set({ isOpen: false }),

    clear: () => set({ draft: null, isOpen: false }),

    // 🔥 hard reset (used on logout / account switch)
    reset: () => set(initialState),
  })
);
