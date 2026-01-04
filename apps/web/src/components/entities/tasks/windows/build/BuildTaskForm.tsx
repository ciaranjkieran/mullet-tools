"use client";

import { useMemo, useCallback } from "react";

import type { Mode } from "@shared/types/Mode";
import type { Goal } from "@shared/types/Goal";
import type { Project } from "@shared/types/Project";
import type { Milestone } from "@shared/types/Milestone";

import TitleInput from "@/components/inputs/TitleInput";
import DueDateInput from "@/components/inputs/DueDateInput";
import DueTimeInput from "@/components/inputs/DueTimeInput";

import EditorEntityInputs from "../../../../inputs/editor/EditorEntityInputs";
import {
  filterEditorOptions,
  reconcileAfterChange,
} from "@shared/lineage/editorFilter";

import { getContrastingText } from "@shared/utils/getContrastingText";

type Props = {
  title: string;
  dueDate: string;
  dueTime: string;
  modeId: number | null;

  // XOR ancestor IDs (you already normalize on submit)
  milestoneId: number | null | undefined;
  projectId: number | null | undefined;
  goalId: number | null | undefined;

  setTitle: (val: string) => void;
  setDueDate: (val: string) => void;
  setDueTime: (val: string) => void;
  setModeId: (id: number) => void;
  setMilestoneId: (id: number | null | undefined) => void;
  setProjectId: (id: number | null | undefined) => void;
  setGoalId: (id: number | null | undefined) => void;

  handleSubmit: (e?: React.FormEvent) => void;

  modes: Mode[];
  goals: Goal[];
  projects: Project[];
  milestones: Milestone[];
};

export default function BuildTaskForm({
  title,
  dueDate,
  dueTime,
  modeId,
  milestoneId,
  projectId,
  goalId,
  setTitle,
  setDueDate,
  setDueTime,
  setModeId,
  setMilestoneId,
  setProjectId,
  setGoalId,
  handleSubmit,
  modes,
  goals,
  projects,
  milestones,
}: Props) {
  // Visual styling from selected Mode (unchanged)
  const selectedMode = modes.find((m) => m.id === (modeId ?? -1));
  const modeColor = selectedMode?.color || "#333";
  const textColor = getContrastingText(modeColor);

  // Selection snapshot for filtering/reconciliation
  const sel = useMemo(
    () => ({
      modeId: modeId ?? -1, // you said a concrete Mode is always selected
      goalId: (goalId ?? null) as number | null,
      projectId: (projectId ?? null) as number | null,
      milestoneId: (milestoneId ?? null) as number | null,
    }),
    [modeId, goalId, projectId, milestoneId]
  );

  // Filter the option lists with pure helper (no stores)
  const filtered = useMemo(
    () =>
      filterEditorOptions(sel, {
        modes,
        goals,
        projects,
        milestones,
      }),
    [sel, modes, goals, projects, milestones]
  );

  const collator = useMemo(
    () => new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }),
    []
  );

  // Keep modes in their defined order, sort others A–Z
  const sorted = useMemo(() => {
    function sortAlpha<T extends { title: string }>(arr: T[]): T[] {
      const none = arr.find((x) => x.title === "None");
      const rest = arr.filter(
        (x) => x.title !== "None" && !x.title.startsWith("Create")
      );
      const createNew = arr.filter((x) => x.title.startsWith("Create"));
      return [
        ...(none ? [none] : []),
        ...[...rest].sort((a, b) => collator.compare(a.title, b.title)),
        ...createNew,
      ];
    }

    return {
      modes, // preserve order
      goals: sortAlpha(filtered.goals),
      projects: sortAlpha(filtered.projects),
      milestones: sortAlpha(filtered.milestones),
    };
  }, [modes, filtered, collator]);

  // Reconciliation handlers (clear descendants safely)
  const onModeChange = useCallback(
    (nextModeId: number) => {
      // When Mode changes, clear everything below using the pure helper
      const rec = reconcileAfterChange(
        sel,
        { modeId: nextModeId },
        { modes, goals, projects, milestones }
      );
      setModeId(nextModeId);
      setGoalId(rec.goalId);
      setProjectId(rec.projectId);
      setMilestoneId(rec.milestoneId);
    },
    [
      sel,
      modes,
      goals,
      projects,
      milestones,
      setModeId,
      setGoalId,
      setProjectId,
      setMilestoneId,
    ]
  );

  const onGoalChange = useCallback(
    (nextGoalId: number | null) => {
      const rec = reconcileAfterChange(
        sel,
        { goalId: nextGoalId },
        { modes, goals, projects, milestones }
      );
      setGoalId(rec.goalId);
      setProjectId(rec.projectId);
      setMilestoneId(rec.milestoneId);
    },
    [
      sel,
      modes,
      goals,
      projects,
      milestones,
      setGoalId,
      setProjectId,
      setMilestoneId,
    ]
  );
  const onProjectChange = useCallback(
    (nextProjectId: number | null) => {
      const rec = reconcileAfterChange(
        sel,
        { projectId: nextProjectId },
        { modes, goals, projects, milestones }
      );
      // Apply ALL possibly updated fields
      setGoalId(rec.goalId);
      setProjectId(rec.projectId);
      setMilestoneId(rec.milestoneId);
    },
    [
      sel,
      modes,
      goals,
      projects,
      milestones,
      setGoalId,
      setProjectId,
      setMilestoneId,
    ]
  );

  const onMilestoneChange = useCallback(
    (nextMilestoneId: number | null) => {
      const rec = reconcileAfterChange(
        sel,
        { milestoneId: nextMilestoneId },
        { modes, goals, projects, milestones }
      );
      // Apply ALL possibly updated fields (cascade-up included)
      setGoalId(rec.goalId);
      setProjectId(rec.projectId);
      setMilestoneId(rec.milestoneId);
    },
    [
      sel,
      modes,
      goals,
      projects,
      milestones,
      setGoalId,
      setProjectId,
      setMilestoneId,
    ]
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="relative px-6 py-6 pt-8 md:px-10 md:py-10 text-sm text-gray-900"
    >
      {/* Top bar and sidebar */}
      <div
        className="absolute top-0 left-0 w-full h-1.5 md:h-4 rounded-t-xl"
        style={{ backgroundColor: modeColor, opacity: 0.3 }}
      />
      <div
        className="absolute top-0 left-0 h-full w-1.5 md:w-2 rounded-l-xl"
        style={{ backgroundColor: modeColor, opacity: 0.5 }}
      />

      {/* Title */}
      <div className="mb-6">
        <TitleInput title={title} setTitle={setTitle} label="Task" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
        {/* LEFT */}
        <div className="flex flex-col gap-6">
          <DueDateInput
            dueDate={dueDate}
            setDueDate={setDueDate}
            showPostpone={false}
          />
          <DueTimeInput dueTime={dueTime} setDueTime={setDueTime} />
        </div>

        {/* RIGHT — lineage inputs via the Editor orchestrator */}
        <div className="flex flex-col gap-6">
          <EditorEntityInputs
            variant="edit"
            modes={sorted.modes}
            goals={sorted.goals}
            projects={sorted.projects}
            milestones={sorted.milestones}
            modeId={sel.modeId}
            goalId={sel.goalId}
            projectId={sel.projectId}
            milestoneId={sel.milestoneId}
            onModeChange={onModeChange}
            onGoalChange={onGoalChange}
            onProjectChange={onProjectChange}
            onMilestoneChange={onMilestoneChange}
            modeColor={modeColor}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end items-center pt-6">
        <button
          type="submit"
          className="px-5 py-2 text-sm font-semibold rounded-md"
          style={{ backgroundColor: modeColor, color: textColor }}
        >
          Create Task
        </button>
      </div>
    </form>
  );
}
