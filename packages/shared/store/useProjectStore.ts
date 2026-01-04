import { create } from "zustand";
import { Project } from "@shared/types/Project";

interface ProjectStore {
  projects: Project[];

  selectedProjectId: number | null;
  setSelectedProjectId: (id: number | null) => void;

  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (updated: Project) => void;
  deleteProject: (id: number) => void;

  moveProjectToDate: (projectId: number, newDate: string | null) => void;

  getChildProjects: (parentId: number | null) => Project[];
  updateProjectParent: (id: number, parentId: number | null) => void;

  reorderProjects: (newOrder: number[]) => void;
  updateProjectPositionsLocally: (
    updates: { id: number; position: number }[]
  ) => void;

  reorderUnscheduledInParent: (
    parentId: number | null,
    orderedIds: number[]
  ) => void;

  // 🔥 reset
  reset: () => void;
}

/* ---------------------------------- */
/* Initial state                      */
/* ---------------------------------- */

const initialState = {
  projects: [] as Project[],
  selectedProjectId: null as number | null,
};

/* ---------------------------------- */
/* Store                              */
/* ---------------------------------- */

export const useProjectStore = create<ProjectStore>((set, get) => ({
  ...initialState,

  setSelectedProjectId: (id) => set({ selectedProjectId: id }),

  setProjects: (projects) => set({ projects }),

  addProject: (project) =>
    set((state) => ({ projects: [...state.projects, project] })),

  updateProject: (updated) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === updated.id ? { ...p, ...updated } : p
      ),
    })),

  deleteProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
    })),

  moveProjectToDate: (projectId, newDate) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, dueDate: newDate } : p
      ),
    })),

  getChildProjects: (parentId) =>
    get().projects.filter((p) => p.parentId === parentId),

  updateProjectParent: (id, parentId) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, parentId } : p
      ),
    })),

  reorderProjects: (newOrderIds) =>
    set((state) => {
      const indexOf = new Map<number, number>();
      newOrderIds.forEach((id, i) => indexOf.set(id, i));

      return {
        projects: state.projects.map((p) =>
          indexOf.has(p.id) ? { ...p, position: indexOf.get(p.id)! } : p
        ),
      };
    }),

  updateProjectPositionsLocally: (updates) =>
    set((state) => {
      const posMap = new Map<number, number>();
      updates.forEach((u) => posMap.set(u.id, u.position));

      return {
        projects: state.projects.map((p) =>
          posMap.has(p.id) ? { ...p, position: posMap.get(p.id)! } : p
        ),
      };
    }),

  reorderUnscheduledInParent: (parentId, orderedIds) =>
    set((state) => {
      const indexOf = new Map<number, number>();
      orderedIds.forEach((id, i) => indexOf.set(id, i));

      return {
        projects: state.projects.map((p) =>
          p.parentId === parentId && indexOf.has(p.id)
            ? { ...p, position: indexOf.get(p.id)! }
            : p
        ),
      };
    }),

  reset: () => set(initialState),
}));
