import { create } from "zustand";

export const useBatchEditorStore = create<{
  isBatchEditorOpen: boolean;
  setIsBatchEditorOpen: (val: boolean) => void;
}>((set) => ({
  isBatchEditorOpen: false,
  setIsBatchEditorOpen: (val) => set({ isBatchEditorOpen: val }),
}));
