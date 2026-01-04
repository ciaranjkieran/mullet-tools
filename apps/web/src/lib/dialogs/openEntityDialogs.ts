import { useDialogStore } from "@/lib/dialogs/useDialogStore";
import { Milestone } from "@shared/types/Milestone";
import { Task } from "@shared/types/Task";
import { Project } from "@shared/types/Project";
import { Goal } from "@shared/types/Goal";

export function openTaskDialogFromComments(task: Task) {
  const store = useDialogStore.getState();
  store.setTaskToEdit(task);
  store.setTaskDialogTab("comments");
  store.setIsTaskDialogOpen(true);
}

export function openMilestoneDialogFromComments(milestone: Milestone) {
  const store = useDialogStore.getState();
  store.setMilestoneToEdit(milestone);
  store.setMilestoneDialogTab("comments");
  store.setIsMilestoneDialogOpen(true);
}

export function openProjectDialogFromComments(project: Project) {
  const store = useDialogStore.getState();
  store.setProjectToEdit(project);
  store.setProjectDialogTab("comments");
  store.setIsProjectDialogOpen(true);
}

export function openGoalDialogFromComments(goal: Goal) {
  const store = useDialogStore.getState();
  store.setGoalToEdit(goal);
  store.setGoalDialogTab("comments");
  store.setIsGoalDialogOpen(true);
}
