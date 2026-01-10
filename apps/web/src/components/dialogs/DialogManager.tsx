"use client";

import { useDialogStore } from "@/lib/dialogs/useDialogStore";

import TaskWindow from "../entities/tasks/windows/TaskWindow";
import BuildTaskWindow from "../entities/tasks/windows/build/BuildTaskWindow";
import BuildMilestoneWindow from "../entities/milestones/windows/build/BuildMilestoneWindow";
import MilestoneWindow from "../entities/milestones/windows/MilestoneWindow";
import BuildProjectWindow from "../entities/projects/windows/build/BuildProjectWindow";
import ProjectWindow from "../entities/projects/windows/ProjectWindow";
import BuildGoalWindow from "../entities/goals/windows/build/BuildGoalWindow";
import GoalWindow from "../entities/goals/windows/GoalWindow";
import EditModesModal from "../entities/modes/windows/EditModesModal";
import BatchEditorWindow from "@/components/batch/BatchEditorWindow";
import BatchEditorTrigger from "@/components/batch/BatchEditorTrigger";

import { Goal } from "@shared/types/Goal";
import { Milestone } from "@shared/types/Milestone";
import { Project } from "@shared/types/Project";
import { Task } from "@shared/types/Task";
import { Mode } from "@shared/types/Mode";

type Props = {
  tasks: Task[];
  goals: Goal[];
  projects: Project[];
  milestones: Milestone[];
  modes: Mode[];
  fallbackModeId: number;
};

export default function DialogManager({
  tasks,
  goals,
  projects,
  milestones,
  modes,
  fallbackModeId,
}: Props) {
  const {
    // Tasks
    taskToEdit,
    isTaskDialogOpen,
    setTaskToEdit,
    setIsTaskDialogOpen,

    // Milestones
    milestoneToEdit,
    isMilestoneDialogOpen,
    setMilestoneToEdit,
    setIsMilestoneDialogOpen,

    // Projects
    projectToEdit,
    isProjectDialogOpen,
    setProjectToEdit,
    setIsProjectDialogOpen,

    // Goals
    goalToEdit,
    isGoalDialogOpen,
    setGoalToEdit,
    setIsGoalDialogOpen,

    // Modes
    isEditModesOpen,
    setIsEditModesOpen,
  } = useDialogStore();

  return (
    <>
      <div className="fixed bottom-10 right-12 z-[200]">
        <BatchEditorTrigger />
      </div>{" "}
      <BatchEditorWindow />
      {/* Task Dialog */}
      {isTaskDialogOpen &&
        (taskToEdit ? (
          <TaskWindow
            task={taskToEdit}
            goals={goals}
            projects={projects}
            milestones={milestones}
            modes={modes}
            defaultModeId={fallbackModeId}
            isOpen={isTaskDialogOpen}
            onClose={() => {
              setTaskToEdit(null);
              setIsTaskDialogOpen(false);
            }}
          />
        ) : (
          <BuildTaskWindow
            isOpen={isTaskDialogOpen}
            onClose={() => setIsTaskDialogOpen(false)}
            defaultModeId={fallbackModeId}
            goals={goals}
            projects={projects}
            milestones={milestones}
            modes={modes}
          />
        ))}
      {/* Milestone Dialog */}
      {isMilestoneDialogOpen &&
        (milestoneToEdit ? (
          <MilestoneWindow
            milestone={milestoneToEdit}
            tasks={tasks}
            goals={goals}
            projects={projects}
            milestones={milestones}
            modes={modes}
            defaultModeId={fallbackModeId}
            isOpen={isMilestoneDialogOpen}
            onClose={() => {
              setMilestoneToEdit(null);
              setIsMilestoneDialogOpen(false);
            }}
          />
        ) : (
          <BuildMilestoneWindow
            isOpen={isMilestoneDialogOpen}
            onClose={() => setIsMilestoneDialogOpen(false)}
            defaultModeId={fallbackModeId}
            goals={goals}
            projects={projects}
            milestones={milestones}
            modes={modes}
          />
        ))}
      {/* Project Dialog */}
      {isProjectDialogOpen &&
        (projectToEdit ? (
          <ProjectWindow
            project={projectToEdit}
            goals={goals}
            tasks={tasks}
            milestones={milestones}
            projects={projects}
            modes={modes}
            isOpen={isProjectDialogOpen}
            onClose={() => {
              setProjectToEdit(null);
              setIsProjectDialogOpen(false);
            }}
          />
        ) : (
          <BuildProjectWindow
            isOpen={isProjectDialogOpen}
            onClose={() => setIsProjectDialogOpen(false)}
            defaultModeId={fallbackModeId}
            goals={goals}
            projects={projects}
            modes={modes}
          />
        ))}
      {/* Goal Dialog */}
      {isGoalDialogOpen &&
        (goalToEdit ? (
          <GoalWindow
            goal={goalToEdit}
            projects={projects}
            milestones={milestones}
            tasks={tasks}
            modes={modes}
            isOpen={isGoalDialogOpen}
            onClose={() => {
              setGoalToEdit(null);
              setIsGoalDialogOpen(false);
            }}
          />
        ) : (
          <BuildGoalWindow
            isOpen={isGoalDialogOpen}
            onClose={() => setIsGoalDialogOpen(false)}
            defaultModeId={fallbackModeId}
            goals={goals}
            projects={projects}
            modes={modes}
          />
        ))}
      {/* Modes Dialog */}
      {isEditModesOpen && (
        <EditModesModal
          isOpen={isEditModesOpen}
          onClose={() => setIsEditModesOpen(false)}
          modes={modes}
        />
      )}
    </>
  );
}
