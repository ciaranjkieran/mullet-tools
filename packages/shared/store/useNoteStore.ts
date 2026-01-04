import { create } from "zustand";
import type { Note } from "@shared/types/Note";

type NoteStore = {
  notes: Note[];

  setNotes: (notes: Note[]) => void;
  addNote: (note: Note) => void;
  updateNote: (note: Note) => void;
  deleteNote: (id: number) => void;

  // 🔥 reset
  reset: () => void;
};

/* ---------------------------------- */
/* Initial state                      */
/* ---------------------------------- */

const initialState = {
  notes: [] as Note[],
};

/* ---------------------------------- */
/* Store                              */
/* ---------------------------------- */

export const useNoteStore = create<NoteStore>((set) => ({
  ...initialState,

  setNotes: (notes) => set({ notes }),

  addNote: (note) => set((state) => ({ notes: [note, ...state.notes] })),

  updateNote: (note) =>
    set((state) => ({
      notes: state.notes.map((n) => (n.id === note.id ? note : n)),
    })),

  deleteNote: (id) =>
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== id),
    })),

  reset: () => set(initialState),
}));
