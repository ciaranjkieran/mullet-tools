import { create } from "zustand";
import { Pin } from "@shared/types/Pin";

type EditPinDialogState = {
  isOpen: boolean;
  pin: Pin | null;
  open: (pin: Pin) => void;
  close: () => void;
};

export const useEditPinDialogStore = create<EditPinDialogState>((set) => ({
  isOpen: false,
  pin: null,
  open: (pin) => set({ isOpen: true, pin }),
  close: () => set({ isOpen: false, pin: null }),
}));
