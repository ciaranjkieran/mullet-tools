"use client";

import React from "react";
import { Mode } from "@shared/types/Mode";
import { Goal } from "@shared/types/Goal";
import { Project } from "@shared/types/Project";
import { Milestone } from "@shared/types/Milestone";

import EditorModeSelect from "./EditorModeSelect";
import EditorGoalSelect from "./EditorGoalSelect";
import EditorProjectSelect from "./EditorProjectSelect";
import EditorMilestoneSelect from "./EditorMilestoneSelect";

export type EditorVariant = "build" | "edit" | "batch";

export type EditorEntityInputsProps = {
  variant: EditorVariant;

  modes: Mode[];
  goals: Goal[];
  projects: Project[];
  milestones: Milestone[];

  modeId: number;
  goalId: number | null;
  projectId: number | null;
  milestoneId: number | null;

  onModeChange?: (id: number) => void;
  onGoalChange?: (id: number | null) => void;
  onProjectChange?: (id: number | null) => void;
  onMilestoneChange?: (id: number | null) => void;
  modeColor?: string;

  locked?: Partial<{ goal: boolean; project: boolean; milestone: boolean }>;
  errors?: Partial<{ goal: string; project: string; milestone: string }>;
  isBatchMixed?: Partial<{
    goal: boolean;
    project: boolean;
    milestone: boolean;
  }>;

  visible?: Partial<{
    mode: boolean;
    goal: boolean;
    project: boolean;
    milestone: boolean;
  }>;

  labels?: Partial<{ goal: string; project: string; milestone: string }>;
};

export default function EditorEntityInputs({
  variant,
  modes,
  goals,
  projects,
  milestones,
  modeId,
  goalId,
  projectId,
  milestoneId,
  onModeChange,
  onGoalChange,
  onProjectChange,
  onMilestoneChange,
  locked,
  errors,
  isBatchMixed,
  modeColor,
  visible,
  labels,
}: EditorEntityInputsProps) {
  const showMode = visible?.mode ?? true;
  const showGoal = visible?.goal ?? true;
  const showProject = visible?.project ?? true;
  const milestoneExplicit = visible?.milestone ?? true;
  const hasMilestones = milestones.length > 0;
  const showMilestone = milestoneExplicit && hasMilestones;

  return (
    <div className="space-y-4">
      {showMode && (
        <EditorModeSelect
          modes={modes}
          modeId={modeId}
          onChange={onModeChange}
          variant={variant}
          modeColor={modeColor}
        />
      )}

      {showGoal && (
        <EditorGoalSelect
          goals={goals}
          goalId={goalId}
          onChange={onGoalChange}
          locked={locked?.goal}
          error={errors?.goal}
          isMixed={isBatchMixed?.goal}
          modeColor={modeColor}
          label={labels?.goal}
        />
      )}

      {showProject && (
        <EditorProjectSelect
          projects={projects}
          projectId={projectId}
          onChange={onProjectChange}
          locked={locked?.project}
          error={errors?.project}
          isMixed={isBatchMixed?.project}
          modeColor={modeColor}
          label={labels?.project}
        />
      )}

      {showMilestone && (
        <EditorMilestoneSelect
          milestones={milestones}
          milestoneId={milestoneId}
          onChange={onMilestoneChange}
          locked={locked?.milestone}
          error={errors?.milestone}
          isMixed={isBatchMixed?.milestone}
          modeColor={modeColor}
          label={labels?.milestone}
        />
      )}
    </div>
  );
}
