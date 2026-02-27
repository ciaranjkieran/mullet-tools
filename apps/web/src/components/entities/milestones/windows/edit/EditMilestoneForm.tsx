"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import type { Mode } from "@shared/types/Mode";
import type { Goal } from "@shared/types/Goal";
import type { Project } from "@shared/types/Project";
import type { Milestone } from "@shared/types/Milestone";

import TitleInput from "@/components/inputs/TitleInput";
import DueDateInput from "@/components/inputs/DueDateInput";
import DueTimeInput from "@/components/inputs/DueTimeInput";
import ConfirmDialog from "@/lib/utils/ConfirmDialog";
import { getContrastingText } from "@shared/utils/getContrastingText";

import {
  parseISO,
  isBefore,
  isAfter,
  isEqual,
  startOfToday,
  addDays,
} from "date-fns";

import EditorAssigneeSelect from "@/components/inputs/editor/EditorAssigneeSelect";

/** Smart orchestrator + pure helpers */
import EditorEntityInputs from "@/components/inputs/editor/EditorEntityInputs";
import {
  filterEditorOptions,
  reconcileAfterChange,
  type EditorSelection,
  type EditorDatasets,
} from "@shared/lineage/editorFilter";

type Props = {
  milestone: Milestone;
  title: string;
  dueDate: string;
  dueTime: string;
  modeId: number | null;

  /** Stored XOR ancestor ids (single source of truth) */
  parentId: number | null | undefined; // parent milestone id
  projectId: number | null | undefined;
  goalId: number | null | undefined;
  assignedToId: number | null;

  setTitle: (val: string) => void;
  setDueDate: (val: string) => void;
  setDueTime: (val: string) => void;
  setModeId: (id: number) => void;

  setParentId: (id: number | null | undefined) => void;
  setProjectId: (id: number | null | undefined) => void;
  setGoalId: (id: number | null | undefined) => void;
  setAssignedToId: (id: number | null) => void;

  handleSubmit: (e?: React.FormEvent) => void;
  onCancel: () => void;
  onDelete: () => void;

  modes: Mode[];
  goals: Goal[];
  projects: Project[];
  milestones: Milestone[];
};

export default function EditMilestoneForm({
  milestone,
  title,
  dueDate,
  dueTime,
  modeId,
  parentId,
  projectId,
  goalId,
  assignedToId,
  setTitle,
  setDueDate,
  setDueTime,
  setModeId,
  setParentId,
  setProjectId,
  setGoalId,
  setAssignedToId,
  handleSubmit,
  onCancel,
  onDelete,
  modes,
  goals,
  projects,
  milestones,
}: Props) {
  /* ─────────────────────────────────────────────────────────
     Styling
     ───────────────────────────────────────────────────────── */
  const effectiveModeId: number = modeId ?? (modes.length ? modes[0].id : -1);
  const selectedMode = modes.find((m) => m.id === effectiveModeId);
  const modeColor = selectedMode?.color || "#333";
  const textColor = getContrastingText(modeColor);

  /* ─────────────────────────────────────────────────────────
     Selection + datasets
     ───────────────────────────────────────────────────────── */
  const sel = useMemo<EditorSelection>(
    () => ({
      modeId: effectiveModeId,
      goalId: (goalId ?? null) as number | null,
      projectId: (projectId ?? null) as number | null,
      milestoneId: (parentId ?? null) as number | null, // parent → milestoneId
    }),
    [effectiveModeId, goalId, projectId, parentId]
  );

  const datasets = useMemo<EditorDatasets>(
    () => ({ modes, goals, projects, milestones }),
    [modes, goals, projects, milestones]
  );

  // Filter lists using the unified ancestry-aware rules
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

  // Minimal fix: sorted *copies* of filtered lists (modes untouched)
  const filteredSorted = useMemo(
    () => ({
      goals: sortAlpha(filtered.goals),
      projects: sortAlpha(filtered.projects),
      milestones: sortAlpha(filtered.milestones),
    }),
    [filtered, sortAlpha]
  );

  // Exclude self from parent candidates *after* sorting
  const parentCandidates = useMemo(
    () => filteredSorted.milestones.filter((m) => m.id !== milestone.id),
    [filteredSorted.milestones, milestone.id]
  );

  /* ─────────────────────────────────────────────────────────
     Apply helper: always set ALL possibly changed fields
     ───────────────────────────────────────────────────────── */
  const applyRec = useCallback(
    (rec: EditorSelection) => {
      // mode set separately
      setGoalId(rec.goalId);
      setProjectId(rec.projectId);
      setParentId(rec.milestoneId); // back-map to parentId
    },
    [setGoalId, setProjectId, setParentId]
  );

  /* ─────────────────────────────────────────────────────────
     INITIAL NORMALIZATION (handles nesting on first load)
     - If a parent milestone is set, climb milestone→project→goal
     - Else if a project is set, climb project→goal
     Runs once per milestone.id (prepopulates parents).
     ───────────────────────────────────────────────────────── */

  // local indices
  const projIdx = useMemo(() => {
    const m = new Map<number, Project>();
    for (const p of projects) m.set(p.id, p);
    return m;
  }, [projects]);

  const msIdx = useMemo(() => {
    const m = new Map<number, Milestone>();
    for (const x of milestones) m.set(x.id, x);
    return m;
  }, [milestones]);

  // climb milestone ancestors to find a project
  const effectiveProjectOfMilestone = useCallback(
    (msId: number): number | null => {
      const seen = new Set<number>();
      let cur = msIdx.get(msId);
      while (cur) {
        if (cur.projectId != null) return cur.projectId;
        const parent = cur.parentId;
        if (parent == null || seen.has(parent)) break;
        seen.add(parent);
        cur = msIdx.get(parent);
      }
      return null;
    },
    [msIdx]
  );

  // climb project ancestors to find a goal
  const effectiveGoalOfProject = useCallback(
    (pid: number | null): number | null => {
      if (pid == null) return null;
      const seen = new Set<number>();
      let cur = projIdx.get(pid);
      while (cur) {
        if (cur.goalId != null) return cur.goalId;
        const parent = cur.parentId;
        if (parent == null || seen.has(parent)) break;
        seen.add(parent);
        cur = projIdx.get(parent);
      }
      return null;
    },
    [projIdx]
  );

  // milestone may carry goal via itself/ancestors; else via effective project
  const effectiveGoalOfMilestone = useCallback(
    (msId: number): number | null => {
      const seen = new Set<number>();
      let cur = msIdx.get(msId);
      while (cur) {
        if (cur.goalId != null) return cur.goalId;
        const parent = cur.parentId;
        if (parent == null || seen.has(parent)) break;
        seen.add(parent);
        cur = msIdx.get(parent);
      }
      const effProjId = effectiveProjectOfMilestone(msId);
      return effectiveGoalOfProject(effProjId);
    },
    [msIdx, effectiveProjectOfMilestone, effectiveGoalOfProject]
  );

  const didNormalizeRef = useRef(false);
  useEffect(() => {
    didNormalizeRef.current = false; // new entity
  }, [milestone.id]);

  useEffect(() => {
    if (didNormalizeRef.current) return;
    if (!modes.length) return; // wait for datasets

    // Snapshot current selection
    const cur = sel;

    if (cur.milestoneId != null) {
      // Parent chosen → derive project & goal
      const effProjId = effectiveProjectOfMilestone(cur.milestoneId);
      const effGoalId = effectiveGoalOfMilestone(cur.milestoneId);

      const needProj = effProjId !== cur.projectId;
      const needGoal = effGoalId !== cur.goalId;

      if (needGoal) setGoalId(effGoalId);
      if (needProj) setProjectId(effProjId);
      didNormalizeRef.current = true;
      return;
    }

    if (cur.projectId != null) {
      // Project chosen → derive goal
      const effGoalId = effectiveGoalOfProject(cur.projectId);
      if (effGoalId !== cur.goalId) setGoalId(effGoalId);
      didNormalizeRef.current = true;
      return;
    }

    // Only goal or nothing: nothing to derive upward
    didNormalizeRef.current = true;
  }, [
    modes.length,
    sel,
    milestone.id,
    setGoalId,
    setProjectId,
    effectiveProjectOfMilestone,
    effectiveGoalOfMilestone,
    effectiveGoalOfProject,
  ]);

  /* ─────────────────────────────────────────────────────────
     Change handlers (cascade up & down afterwards)
     ───────────────────────────────────────────────────────── */
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

  /* ─────────────────────────────────────────────────────────
     Safety: clear stored IDs that fall out of scope
     ───────────────────────────────────────────────────────── */
  useEffect(() => {
    const okG =
      sel.goalId == null ||
      filteredSorted.goals.some((g) => g.id === sel.goalId);
    const okP =
      sel.projectId == null ||
      filteredSorted.projects.some((p) => p.id === sel.projectId);
    const okM =
      sel.milestoneId == null ||
      parentCandidates.some((m) => m.id === sel.milestoneId);

    if (!okG) setGoalId(null);
    if (!okP) setProjectId(null);
    if (!okM) setParentId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredSorted.goals, filteredSorted.projects, parentCandidates]);

  /* ─────────────────────────────────────────────────────────
     Due helpers (unchanged)
     ───────────────────────────────────────────────────────── */
  const [confirmOpen, setConfirmOpen] = useState(false);
  function nextMondayDate(): Date {
    const today = startOfToday();
    const day = today.getDay();
    const daysUntilNextMonday = (8 - day) % 7 || 7;
    return addDays(today, daysUntilNextMonday);
  }
  const hasDue = !!dueDate;
  const today = startOfToday();
  const nm = nextMondayDate();

  useEffect(() => {
    if (!dueDate && dueTime) setDueTime("");
  }, [dueDate, dueTime, setDueTime]);

  let shouldShowPostpone = false;
  if (hasDue) {
    const d = parseISO(dueDate);
    const isOverdue = isBefore(d, today);
    const onOrAfterToday = isEqual(d, today) || isAfter(d, today);
    const beforeNextMonday = isBefore(d, nm);
    shouldShowPostpone = !isOverdue && onOrAfterToday && beforeNextMonday;
  }

  return (
    <>
      <div
        className="absolute top-0 left-0 w-full h-1.5 md:h-4 rounded-t-xl"
        style={{ backgroundColor: modeColor }}
      />
      <form
        onSubmit={handleSubmit}
        className="space-y-6 text-sm text-gray-900"
        onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
      >
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
            <TitleInput title={title} setTitle={setTitle} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
          <div className="flex flex-col gap-6">
            <DueDateInput
              dueDate={dueDate}
              setDueDate={setDueDate}
              showPostpone={shouldShowPostpone}
            />
            <DueTimeInput dueTime={dueTime} setDueTime={setDueTime} />
          </div>

          {/* Smart lineage selects with icons + mode color */}
          <div className="flex flex-col gap-4">
            <EditorEntityInputs
              variant="edit"
              modes={modes}
              goals={filteredSorted.goals}
              projects={filteredSorted.projects}
              milestones={parentCandidates}
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
            <EditorAssigneeSelect
              modeId={modeId}
              assignedToId={assignedToId}
              onChange={setAssignedToId}
            />
          </div>
        </div>

        <div className="flex justify-between items-center pt-6">
          {!confirmOpen ? (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="text-sm text-red-500 hover:underline font-semibold"
            >
              Delete Milestone
            </button>
          ) : (
            <ConfirmDialog
              open={confirmOpen}
              onClose={() => setConfirmOpen(false)}
              onConfirm={() => {
                onDelete();
                setConfirmOpen(false);
              }}
              title={`Delete milestone "${milestone.title}"?`}
              description="This action cannot be undone."
              confirmText="Delete"
              cancelText="Cancel"
            />
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm rounded-md bg-gray-200 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold rounded-md"
              style={{ backgroundColor: modeColor, color: textColor }}
            >
              Save
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
