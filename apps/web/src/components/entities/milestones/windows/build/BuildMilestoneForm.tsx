"use client";

import { useMemo, useCallback, useEffect, useRef } from "react";
import type { Mode } from "@shared/types/Mode";
import type { Goal } from "@shared/types/Goal";
import type { Project } from "@shared/types/Project";
import type { Milestone } from "@shared/types/Milestone";

import TitleInput from "@/components/inputs/TitleInput";
import DueDateInput from "@/components/inputs/DueDateInput";
import DueTimeInput from "@/components/inputs/DueTimeInput";

import { getContrastingText } from "@shared/utils/getContrastingText";

import EditorEntityInputs from "@/components/inputs/editor/EditorEntityInputs";
import {
  filterEditorOptions,
  reconcileAfterChange,
  type EditorSelection,
  type EditorDatasets,
} from "@shared/lineage/editorFilter";

type Props = {
  title: string;
  dueDate: string;
  dueTime: string;
  modeId: number | null;
  goalId: number | null | undefined;
  projectId: number | null | undefined;
  parentId: number | null | undefined;
  setTitle: (val: string) => void;
  setDueDate: (val: string) => void;
  setDueTime: (val: string) => void;
  setModeId: (id: number) => void;
  setGoalId: (id: number | null | undefined) => void;
  setProjectId: (id: number | null | undefined) => void;
  setParentId: (id: number | null | undefined) => void;
  handleSubmit: (e?: React.FormEvent) => void;
  modes: Mode[];
  goals: Goal[];
  projects: Project[];
  milestones: Milestone[];
};

export default function BuildMilestoneForm({
  title,
  dueDate,
  dueTime,
  modeId,
  goalId,
  projectId,
  parentId,
  setTitle,
  setDueDate,
  setDueTime,
  setModeId,
  setGoalId,
  setProjectId,
  setParentId,
  handleSubmit,
  modes,
  goals,
  projects,
  milestones,
}: Props) {
  const effectiveModeId: number = modeId ?? (modes.length ? modes[0].id : -1);
  const selectedMode = modes.find((m) => m.id === effectiveModeId);
  const modeColor = selectedMode?.color || "#333";
  const textColor = getContrastingText(modeColor);

  const sel = useMemo<EditorSelection>(
    () => ({
      modeId: effectiveModeId,
      goalId: (goalId ?? null) as number | null,
      projectId: (projectId ?? null) as number | null,
      milestoneId: (parentId ?? null) as number | null,
    }),
    [effectiveModeId, goalId, projectId, parentId]
  );

  const datasets = useMemo<EditorDatasets>(
    () => ({ modes, goals, projects, milestones }),
    [modes, goals, projects, milestones]
  );

  const filtered = useMemo(
    () => filterEditorOptions(sel, datasets),
    [sel, datasets]
  );

  const collator = useMemo(
    () => new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }),
    []
  );

  const sortAlpha = useCallback(
    <T extends { title: string }>(arr: T[]): T[] => {
      const none = arr.find((x) => x.title === "None");
      const rest = arr.filter(
        (x) => x.title !== "None" && !x.title.startsWith("Create")
      );
      const create = arr.filter((x) => x.title.startsWith("Create"));
      return [
        ...(none ? [none] : []),
        ...[...rest].sort((a, b) => collator.compare(a.title, b.title)),
        ...create,
      ];
    },
    [collator]
  );

  const filteredSorted = useMemo(
    () => ({
      goals: sortAlpha(filtered.goals),
      projects: sortAlpha(filtered.projects),
      milestones: sortAlpha(filtered.milestones),
    }),
    [filtered, sortAlpha]
  );

  const applyRec = useCallback(
    (rec: EditorSelection) => {
      setGoalId(rec.goalId);
      setProjectId(rec.projectId);
      setParentId(rec.milestoneId);
    },
    [setGoalId, setProjectId, setParentId]
  );

  const didNormalizeRef = useRef(false);
  useEffect(() => {
    didNormalizeRef.current = false;
  }, []);

  useEffect(() => {
    if (didNormalizeRef.current) return;
    if (!modes.length) return;

    let rec = sel;
    if (sel.milestoneId != null) {
      rec = reconcileAfterChange(
        sel,
        { milestoneId: sel.milestoneId },
        datasets
      );
    } else if (sel.projectId != null) {
      rec = reconcileAfterChange(sel, { projectId: sel.projectId }, datasets);
    } else if (sel.goalId != null) {
      rec = reconcileAfterChange(sel, { goalId: sel.goalId }, datasets);
    } else {
      didNormalizeRef.current = true;
      return;
    }

    const changed =
      rec.modeId !== sel.modeId ||
      rec.goalId !== sel.goalId ||
      rec.projectId !== sel.projectId ||
      rec.milestoneId !== sel.milestoneId;

    if (changed) {
      if (rec.modeId !== sel.modeId) setModeId(rec.modeId);
      applyRec(rec);
    }
    didNormalizeRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, datasets, modes.length, setModeId, applyRec]);

  const onModeChange = useCallback(
    (nextModeId: number) => {
      const rec = reconcileAfterChange(sel, { modeId: nextModeId }, datasets);
      setModeId(rec.modeId);
      applyRec(rec);
    },
    [sel, datasets, setModeId, applyRec]
  );

  const onGoalChange = useCallback(
    (nextGoalId: number | null) => {
      const rec = reconcileAfterChange(sel, { goalId: nextGoalId }, datasets);
      applyRec(rec);
    },
    [sel, datasets, applyRec]
  );

  const onProjectChange = useCallback(
    (nextProjectId: number | null) => {
      const rec = reconcileAfterChange(
        sel,
        { projectId: nextProjectId },
        datasets
      );
      applyRec(rec);
    },
    [sel, datasets, applyRec]
  );

  const onMilestoneChange = useCallback(
    (nextMilestoneId: number | null) => {
      const rec = reconcileAfterChange(
        sel,
        { milestoneId: nextMilestoneId },
        datasets
      );
      applyRec(rec);
    },
    [sel, datasets, applyRec]
  );

  useEffect(() => {
    const okG =
      sel.goalId == null ||
      filteredSorted.goals.some((g) => g.id === sel.goalId);
    const okP =
      sel.projectId == null ||
      filteredSorted.projects.some((p) => p.id === sel.projectId);
    const okM =
      sel.milestoneId == null ||
      filteredSorted.milestones.some((m) => m.id === sel.milestoneId);

    if (!okG) setGoalId(null);
    if (!okP) setProjectId(null);
    if (!okM) setParentId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filteredSorted.goals,
    filteredSorted.projects,
    filteredSorted.milestones,
  ]);

  return (
    <form
      onSubmit={handleSubmit}
      className="relative px-6 py-6 pt-8 md:px-10 md:py-10 text-sm text-gray-900"
    >
      <div
        className="absolute top-0 left-0 w-full h-1.5 md:h-4 rounded-t-xl"
        style={{ backgroundColor: modeColor, opacity: 0.3 }}
      />
      <div
        className="absolute top-0 left-0 h-full w-1.5 md:w-2 rounded-l-xl"
        style={{ backgroundColor: modeColor, opacity: 0.5 }}
      />

      <div className="flex items-center gap-2 mb-4">
        <span
          className="triangle"
          style={{
            borderTopColor: modeColor,
            borderTopWidth: 20,
            borderLeftWidth: 12,
            borderRightWidth: 12,
          }}
        />
        <div className="flex-1">
          <TitleInput title={title} setTitle={setTitle} label="Milestone" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
        <div className="flex flex-col gap-6">
          <DueDateInput
            dueDate={dueDate}
            setDueDate={setDueDate}
            showPostpone={false}
          />
          <DueTimeInput dueTime={dueTime} setDueTime={setDueTime} />
        </div>

        <div className="flex flex-col gap-6">
          <EditorEntityInputs
            variant="build"
            modes={modes}
            goals={filteredSorted.goals}
            projects={filteredSorted.projects}
            milestones={filteredSorted.milestones}
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

      <div className="flex justify-end items-center pt-6">
        <button
          type="submit"
          className="px-5 py-2 text-sm font-semibold rounded-md"
          style={{ backgroundColor: modeColor, color: textColor }}
        >
          Create Milestone
        </button>
      </div>
    </form>
  );
}
