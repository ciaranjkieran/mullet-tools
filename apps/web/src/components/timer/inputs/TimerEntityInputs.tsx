"use client";

import React from "react";

import { Mode } from "@shared/types/Mode";
import { Goal } from "@shared/types/Goal";
import { Project } from "@shared/types/Project";
import { Milestone } from "@shared/types/Milestone";
import { Task } from "@shared/types/Task";

import TimerModeSelect from "./TimerModeSelect";
import TimerGoalSelect from "./TimerGoalSelect";
import TimerProjectSelect from "./TimerProjectSelect";
import TimerMilestoneSelect from "./TimerMilestoneSelect";
import TimerTaskSelect from "./TimerTaskInput";

type Props = {
  modes: Mode[];
  goals: Goal[];
  projects: Project[];
  milestones: Milestone[];
  tasks: Task[];

  modeId: number | null;
  goalId: number | null;
  projectId: number | null;
  milestoneId: number | null;
  taskId: number | null;

  onModeChange?: (id: number) => void;
  onGoalChange?: (id: number | null) => void;
  onProjectChange?: (id: number | null) => void;
  onMilestoneChange?: (id: number | null) => void;
  onTaskChange?: (id: number | null) => void;

  modeColor: string;

  visible?: Partial<{
    mode: boolean;
    goal: boolean;
    project: boolean;
    milestone: boolean;
    task: boolean;
  }>;
};

export default function TimerEntityInputs({
  modes,
  goals,
  projects,
  milestones,
  tasks,
  modeId,
  goalId,
  projectId,
  milestoneId,
  taskId,
  onModeChange,
  onGoalChange,
  onProjectChange,
  onMilestoneChange,
  onTaskChange,
  modeColor,
  visible,
}: Props) {
  const showMode = visible?.mode ?? true;
  const showGoal = visible?.goal ?? true;
  const showProject = visible?.project ?? true;
  const showMilestone = visible?.milestone ?? true;
  const showTask = visible?.task ?? true;

  return (
    <div className="space-y-4">
      {showMode && (
        <TimerModeSelect
          modes={modes}
          modeId={modeId}
          onChange={onModeChange}
          modeColor={modeColor}
        />
      )}

      {showGoal && (
        <TimerGoalSelect
          goals={goals}
          goalId={goalId}
          onChange={onGoalChange}
          modeColor={modeColor}
        />
      )}

      {showProject && (
        <TimerProjectSelect
          projects={projects}
          projectId={projectId}
          onChange={onProjectChange}
          modeColor={modeColor}
        />
      )}

      {showMilestone && (
        <TimerMilestoneSelect
          milestones={milestones}
          milestoneId={milestoneId}
          onChange={onMilestoneChange}
          modeColor={modeColor}
        />
      )}

      {showTask && (
        <TimerTaskSelect
          tasks={tasks}
          taskId={taskId}
          onChange={onTaskChange}
          modeColor={modeColor}
        />
      )}
    </div>
  );
}
