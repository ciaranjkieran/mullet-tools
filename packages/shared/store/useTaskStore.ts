// src/shared/store/useTaskStore.ts
import { create } from "zustand";
import { Task } from "../types/Task";

interface TaskStore {
  tasks: Task[];
  selectedTaskIds: number[];

  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (updated: Task) => void;
  deleteTask: (id: number) => void;

  moveTaskToDate: (taskId: number, newDate: string) => void;
  updateTaskDate: (taskId: number, newDate: string) => void;

  updateTaskPositionsLocally: (
    updates: { id: number; position: number }[]
  ) => void;

  reorderTasksInMode: (
    modeId: number,
    newTaskOrder: number[],
    headerId?: number | null
  ) => void;

  reorderTask: (taskId: number, newIndex: number) => void;

  toggleTaskSelection: (id: number) => void;
  clearSelectedTasks: () => void;
  deselectTask: (taskId: number) => void;

  // 🔥 reset
  reset: () => void;
}

/* ---------------------------------- */
/* Initial state                      */
/* ---------------------------------- */

const initialState = {
  tasks: [] as Task[],
  selectedTaskIds: [] as number[],
};

/* ---------------------------------- */
/* Store                              */
/* ---------------------------------- */

export const useTaskStore = create<TaskStore>((set) => ({
  ...initialState,

  /* ---------- selection ---------- */

  toggleTaskSelection: (taskId) =>
    set((state) => ({
      selectedTaskIds: state.selectedTaskIds.includes(taskId)
        ? state.selectedTaskIds.filter((id) => id !== taskId)
        : [...state.selectedTaskIds, taskId],
    })),

  deselectTask: (taskId) =>
    set((state) => ({
      selectedTaskIds: state.selectedTaskIds.filter((id) => id !== taskId),
    })),

  clearSelectedTasks: () => set({ selectedTaskIds: [] }),

  /* ---------- CRUD ---------- */

  setTasks: (tasks) => set({ tasks }),

  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),

  updateTask: (updated) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === updated.id ? updated : t)),
    })),

  deleteTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    })),

  /* ---------- scheduling ---------- */

  moveTaskToDate: (taskId, newDate) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, dueDate: newDate } : t
      ),
    })),

  updateTaskDate: (taskId, newDate) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, dueDate: newDate } : t
      ),
    })),

  /* ---------- ordering ---------- */

  reorderTasksInMode: () => {},
  reorderTask: () => {},

  updateTaskPositionsLocally: (updates) =>
    set((state) => {
      const map = new Map(updates.map((u) => [u.id, u.position]));
      return {
        tasks: state.tasks.map((t) =>
          map.has(t.id) ? { ...t, position: map.get(t.id)! } : t
        ),
      };
    }),

  /* ---------- reset ---------- */

  reset: () => set(initialState),
}));
