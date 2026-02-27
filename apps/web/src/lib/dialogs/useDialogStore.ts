// lib/store/useDialogStore.ts
import { create } from "zustand";
import { Milestone } from "@shared/types/Milestone";
import { Task } from "@shared/types/Task";
import { Project } from "@shared/types/Project";
import { Goal } from "@shared/types/Goal";

type Tab = "edit" | "structure" | "comments" | "notes" | "boards" | "stats"; // ← Add this

type DialogStore = {
  // Tasks
  taskToEdit: Task | null;
  isTaskDialogOpen: boolean;
  taskDialogTab: Tab;
  setTaskToEdit: (task: Task | null) => void;
  setIsTaskDialogOpen: (open: boolean) => void;
  setTaskDialogTab: (tab: Tab) => void;

  // Milestones
  milestoneToEdit: Milestone | null;
  isMilestoneDialogOpen: boolean;
  milestoneDialogTab: Tab;
  setMilestoneToEdit: (milestone: Milestone | null) => void;
  setIsMilestoneDialogOpen: (open: boolean) => void;
  setMilestoneDialogTab: (tab: Tab) => void;

  // Projects
  projectToEdit: Project | null;
  isProjectDialogOpen: boolean;
  projectDialogTab: Tab;
  setProjectToEdit: (project: Project | null) => void;
  setIsProjectDialogOpen: (open: boolean) => void;
  setProjectDialogTab: (tab: Tab) => void;

  // Goals
  goalToEdit: Goal | null;
  isGoalDialogOpen: boolean;
  goalDialogTab: Tab;
  setGoalToEdit: (goal: Goal | null) => void;
  setIsGoalDialogOpen: (open: boolean) => void;
  setGoalDialogTab: (tab: Tab) => void;

  // Modes (no tabs needed)
  isEditModesOpen: boolean;
  setIsEditModesOpen: (open: boolean) => void;

  // Collaboration modal
  isCollaborationModalOpen: boolean;
  collaborationModeId: number | null;
  setIsCollaborationModalOpen: (open: boolean) => void;
  setCollaborationModeId: (id: number | null) => void;
  openCollaborationModal: (modeId: number) => void;

  // AI Builder modal
  isAiBuilderOpen: boolean;
  setIsAiBuilderOpen: (open: boolean) => void;
};

export const useDialogStore = create<DialogStore>((set) => ({
  // Task dialog
  taskToEdit: null,
  isTaskDialogOpen: false,
  taskDialogTab: "edit",
  setTaskToEdit: (task) => set({ taskToEdit: task }),
  setIsTaskDialogOpen: (open) => set({ isTaskDialogOpen: open }),
  setTaskDialogTab: (tab) => set({ taskDialogTab: tab }),

  // Milestone dialog
  milestoneToEdit: null,
  isMilestoneDialogOpen: false,
  milestoneDialogTab: "edit",
  setMilestoneToEdit: (milestone) => set({ milestoneToEdit: milestone }),
  setIsMilestoneDialogOpen: (open) => set({ isMilestoneDialogOpen: open }),
  setMilestoneDialogTab: (tab) => set({ milestoneDialogTab: tab }),

  // Project dialog
  projectToEdit: null,
  isProjectDialogOpen: false,
  projectDialogTab: "edit",
  setProjectToEdit: (project) => set({ projectToEdit: project }),
  setIsProjectDialogOpen: (open) => set({ isProjectDialogOpen: open }),
  setProjectDialogTab: (tab) => set({ projectDialogTab: tab }),

  // Goal dialog
  goalToEdit: null,
  isGoalDialogOpen: false,
  goalDialogTab: "edit",
  setGoalToEdit: (goal) => set({ goalToEdit: goal }),
  setIsGoalDialogOpen: (open) => set({ isGoalDialogOpen: open }),
  setGoalDialogTab: (tab) => set({ goalDialogTab: tab }),

  // Modes modal
  isEditModesOpen: false,
  setIsEditModesOpen: (open) => set({ isEditModesOpen: open }),

  // Collaboration modal
  isCollaborationModalOpen: false,
  collaborationModeId: null,
  setIsCollaborationModalOpen: (open) => set({ isCollaborationModalOpen: open }),
  setCollaborationModeId: (id) => set({ collaborationModeId: id }),
  openCollaborationModal: (modeId) =>
    set({ isCollaborationModalOpen: true, collaborationModeId: modeId }),

  // AI Builder modal
  isAiBuilderOpen: false,
  setIsAiBuilderOpen: (open) => set({ isAiBuilderOpen: open }),
}));
