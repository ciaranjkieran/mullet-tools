"use client";

import { useMemo, useCallback, useEffect, useRef } from "react";
import type { Mode } from "@shared/types/Mode";
import type { Goal } from "@shared/types/Goal";
import type { Project } from "@shared/types/Project";

import TitleInput from "@/components/inputs/TitleInput";
import DueDateInput from "@/components/inputs/DueDateInput";
import DueTimeInput from "@/components/inputs/DueTimeInput";
import EditorEntityInputs from "@/components/inputs/editor/EditorEntityInputs";

import { getContrastingText } from "@shared/utils/getContrastingText";
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
  parentId: number | null | undefined;
  setTitle: (val: string) => void;
  setDueDate: (val: string) => void;
  setDueTime: (val: string) => void;
  setModeId: (id: number) => void;
  setGoalId: (id: number | null | undefined) => void;
  setParentId: (id: number | null | undefined) => void;
  handleSubmit: (e?: React.FormEvent) => void;
  modes: Mode[];
  goals: Goal[];
  projects: Project[];
};

export default function BuildProjectForm({
  title,
  dueDate,
  dueTime,
  modeId,
  goalId,
  parentId,
  setTitle,
  setDueDate,
  setDueTime,
  setModeId,
  setGoalId,
  setParentId,
  handleSubmit,
  modes,
  goals,
  projects,
}: Props) {
  const effectiveModeId: number = modeId ?? (modes.length ? modes[0].id : -1);
  const selectedMode = modes.find((m) => m.id === effectiveModeId);
  const modeColor = selectedMode?.color || "#333";
  const textColor = getContrastingText(modeColor);

  const projById = useMemo(() => {
    const m = new Map<number, Project>();
    projects.forEach((p) => m.set(p.id, p));
    return m;
  }, [projects]);

  const getEffectiveGoalFromProjectId = useCallback(
    (pid: number | null | undefined): number | null => {
      if (pid == null) return null;
      const seen = new Set<number>();
      let cur: Project | undefined = projById.get(pid);
      while (cur && !seen.has(cur.id)) {
        seen.add(cur.id);
        if (cur.goalId != null) return cur.goalId;
        const parentId = cur.parentId ?? null;
        cur = parentId != null ? projById.get(parentId) : undefined;
      }
      return null;
    },
    [projById]
  );

  const sel = useMemo<EditorSelection>(
    () => ({
      modeId: effectiveModeId,
      goalId: (goalId ?? null) as number | null,
      projectId: (parentId ?? null) as number | null,
      milestoneId: null,
    }),
    [effectiveModeId, goalId, parentId]
  );

  const datasets = useMemo<EditorDatasets>(
    () => ({ modes, goals, projects, milestones: [] as any }),
    [modes, goals, projects]
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
    }),
    [filtered, sortAlpha]
  );

  const applyRec = useCallback(
    (rec: EditorSelection) => {
      setGoalId(rec.goalId);
      setParentId(rec.projectId);
    },
    [setGoalId, setParentId]
  );

  const applyAll = useCallback(
    (rec: EditorSelection) => {
      if (rec.modeId !== sel.modeId) setModeId(rec.modeId);
      applyRec(rec);
    },
    [sel.modeId, setModeId, applyRec]
  );

  const didNormalizeRef = useRef(false);
  useEffect(() => {
    didNormalizeRef.current = false;
  }, []);

  useEffect(() => {
    if (didNormalizeRef.current) return;
    if (!modes.length) return;

    let rec = sel;
    if (sel.projectId != null) {
      rec = reconcileAfterChange(sel, { projectId: sel.projectId }, datasets);
      rec = { ...rec, goalId: null };
    } else if (sel.goalId != null) {
      rec = reconcileAfterChange(sel, { goalId: sel.goalId }, datasets);
      rec = { ...rec, projectId: null };
    } else {
      didNormalizeRef.current = true;
      return;
    }

    const changed =
      rec.modeId !== sel.modeId ||
      rec.goalId !== sel.goalId ||
      rec.projectId !== sel.projectId;

    if (changed) applyAll(rec);
    didNormalizeRef.current = true;
  }, [sel, datasets, modes.length, applyAll]);

  const onModeChange = useCallback(
    (nextModeId: number) => {
      const rec = reconcileAfterChange(sel, { modeId: nextModeId }, datasets);
      applyAll(rec);
    },
    [sel, datasets, applyAll]
  );

  const onGoalChange = useCallback(
    (nextGoalId: number | null) => {
      let rec = reconcileAfterChange(sel, { goalId: nextGoalId }, datasets);
      rec = { ...rec, projectId: null };
      applyAll(rec);
    },
    [sel, datasets, applyAll]
  );

  const onParentChange = useCallback(
    (nextParentId: number | null) => {
      let rec = reconcileAfterChange(
        sel,
        { projectId: nextParentId },
        datasets
      );
      rec = { ...rec, goalId: null };
      applyAll(rec);
    },
    [sel, datasets, applyAll]
  );

  useEffect(() => {
    const okG =
      sel.goalId == null ||
      filteredSorted.goals.some((g) => g.id === sel.goalId);
    const okP =
      sel.projectId == null ||
      filteredSorted.projects.some((p) => p.id === sel.projectId);
    if (!okG) setGoalId(null);
    if (!okP) setParentId(null);
  }, [
    filteredSorted.goals,
    filteredSorted.projects,
    sel.goalId,
    sel.projectId,
    setGoalId,
    setParentId,
  ]);

  const displayGoalId =
    sel.projectId != null
      ? getEffectiveGoalFromProjectId(sel.projectId) ?? null
      : sel.goalId;

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
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill={modeColor}
          viewBox="0 0 24 24"
          className="w-7 h-7"
        >
          <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h5.379a1.5 1.5 0 0 1 1.06.44l1.621 1.62H19.5A1.5 1.5 0 0 1 21 6.56V18a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 18V4.5Z" />
        </svg>
        <div className="flex-1">
          <TitleInput title={title} setTitle={setTitle} label="Project" />
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
            milestones={[]}
            modeId={sel.modeId}
            goalId={displayGoalId}
            projectId={sel.projectId}
            milestoneId={null}
            onModeChange={onModeChange}
            onGoalChange={onGoalChange}
            onProjectChange={onParentChange}
            onMilestoneChange={() => {}}
            modeColor={modeColor}
            visible={{ milestone: false }}
          />
        </div>
      </div>

      <div className="flex justify-end items-center pt-6">
        <button
          type="submit"
          className="px-5 py-2 text-sm font-semibold rounded-md"
          style={{ backgroundColor: modeColor, color: textColor }}
        >
          Create Project
        </button>
      </div>
    </form>
  );
}
