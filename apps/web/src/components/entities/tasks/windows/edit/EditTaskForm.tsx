"use client";

import { useMemo, useRef, useState, useCallback, useEffect } from "react";

import type { Mode } from "@shared/types/Mode";
import type { Goal } from "@shared/types/Goal";
import type { Project } from "@shared/types/Project";
import type { Milestone } from "@shared/types/Milestone";
import type { Task } from "@shared/types/Task";

import TitleInput from "@/components/inputs/TitleInput";
import DueDateInput from "@/components/inputs/DueDateInput";
import DueTimeInput from "@/components/inputs/DueTimeInput";
import ConfirmDialog from "@/lib/utils/ConfirmDialog";

import { getContrastingText } from "@shared/utils/getContrastingText";
import {
  startOfToday,
  parseISO,
  addDays,
  isBefore,
  isAfter,
  isEqual,
} from "date-fns";

/** Unified lineage orchestrator (smart selects) */
import EditorEntityInputs from "@/components/inputs/editor/EditorEntityInputs";
import EditorAssigneeSelect from "@/components/inputs/editor/EditorAssigneeSelect";
import {
  filterEditorOptions,
  reconcileAfterChange,
  type EditorSelection,
  type EditorDatasets,
} from "@shared/lineage/editorFilter";

type Props = {
  task: Task;
  title: string;
  dueDate: string;
  dueTime: string;
  modeId: number | null;

  /** Stored XOR ancestor ids (single source of truth) */
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

  assignedToId: number | null;
  setAssignedToId: (id: number | null) => void;

  handleSubmit: (e?: React.FormEvent) => void;
  onCancel: () => void;
  onDelete: () => void;

  modes: Mode[];
  goals: Goal[];
  projects: Project[];
  milestones: Milestone[];
};

export default function EditTaskForm({
  task,
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
  assignedToId,
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
     Styling + small hygiene
     ───────────────────────────────────────────────────────── */
  const effectiveModeId: number = modeId ?? (modes.length ? modes[0].id : -1); // fallback-safe
  const selectedMode = modes.find((m) => m.id === effectiveModeId);
  const modeColor = selectedMode?.color || "#333";
  const textColor = getContrastingText(modeColor);

  const titleRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    titleRef.current?.blur();
  }, []);
  useEffect(() => {
    if (!dueDate && dueTime) setDueTime("");
  }, [dueDate, dueTime, setDueTime]);

  /* ─────────────────────────────────────────────────────────
     Selection + datasets
     ───────────────────────────────────────────────────────── */
  const sel = useMemo<EditorSelection>(
    () => ({
      modeId: effectiveModeId,
      goalId: (goalId ?? null) as number | null,
      projectId: (projectId ?? null) as number | null,
      milestoneId: (milestoneId ?? null) as number | null,
    }),
    [effectiveModeId, goalId, projectId, milestoneId]
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

  /* ─────────────────────────────────────────────────────────
     Apply helper: always set ALL possibly changed fields
     ───────────────────────────────────────────────────────── */
  const applyRec = useCallback(
    (rec: EditorSelection) => {
      setGoalId(rec.goalId);
      setProjectId(rec.projectId);
      setMilestoneId(rec.milestoneId);
    },
    [setGoalId, setProjectId, setMilestoneId]
  );

  /* ─────────────────────────────────────────────────────────
   INITIAL NORMALIZATION (cascade-up on first load)
   — handles nested milestones & nested projects
   ───────────────────────────────────────────────────────── */

  // small local index helpers (fast lookups)
  const projIdx = useMemo(() => {
    const m = new Map<number, Project>();
    for (const p of projects) m.set(p.id, p);
    return m;
  }, [projects]);

  const msIdx = useMemo(() => {
    const m = new Map<number, Milestone>();
    for (const ms of milestones) m.set(ms.id, ms);
    return m;
  }, [milestones]);

  // climb milestone ancestors to find a project
  const effectiveProjectOfMilestone = useCallback(
    (msId: number): number | null => {
      const seen = new Set<number>();
      let cur = msIdx.get(msId);
      while (cur) {
        if (cur.projectId != null) return cur.projectId;
        if (cur.parentId == null) break;
        if (seen.has(cur.parentId)) break;
        seen.add(cur.parentId);
        cur = msIdx.get(cur.parentId);
      }
      return null;
    },
    [msIdx]
  );

  // climb project ancestors to find a goal
  const effectiveGoalOfProject = useCallback(
    (projectId: number | null): number | null => {
      if (projectId == null) return null;
      const seen = new Set<number>();
      let cur = projIdx.get(projectId);
      while (cur) {
        if (cur.goalId != null) return cur.goalId;
        if (cur.parentId == null) break;
        if (seen.has(cur.parentId)) break;
        seen.add(cur.parentId);
        cur = projIdx.get(cur.parentId);
      }
      return null;
    },
    [projIdx]
  );

  // milestone may carry goal itself (or via ancestor milestone); otherwise via effective project chain
  const effectiveGoalOfMilestone = useCallback(
    (msId: number): number | null => {
      const seen = new Set<number>();
      let cur = msIdx.get(msId);
      // try milestone chain first
      while (cur) {
        if (cur.goalId != null) return cur.goalId;
        if (cur.parentId == null) break;
        if (seen.has(cur.parentId)) break;
        seen.add(cur.parentId);
        cur = msIdx.get(cur.parentId);
      }
      // else via project chain
      const effProjId = effectiveProjectOfMilestone(msId);
      return effectiveGoalOfProject(effProjId);
    },
    [msIdx, effectiveProjectOfMilestone, effectiveGoalOfProject]
  );

  const didNormalizeRef = useRef(false);
  // reset when switching to a different task
  useEffect(() => {
    didNormalizeRef.current = false;
  }, [task.id]);

  useEffect(() => {
    if (didNormalizeRef.current) return;
    if (!modes.length) return; // wait for datasets

    // Take current selection snapshot
    const curSel = sel;

    // Case 1: milestone present → derive project & goal (with nesting)
    if (curSel.milestoneId != null) {
      const effProjId = effectiveProjectOfMilestone(curSel.milestoneId);
      const effGoalId = effectiveGoalOfMilestone(curSel.milestoneId);

      const needProj = effProjId !== curSel.projectId;
      const needGoal = effGoalId !== curSel.goalId;

      if (needProj || needGoal) {
        if (needGoal) setGoalId(effGoalId);
        if (needProj) setProjectId(effProjId);
      }
      didNormalizeRef.current = true;
      return;
    }

    // Case 2: project present → derive goal (with nesting)
    if (curSel.projectId != null) {
      const effGoalId = effectiveGoalOfProject(curSel.projectId);
      if (effGoalId !== curSel.goalId) {
        setGoalId(effGoalId);
      }
      didNormalizeRef.current = true;
      return;
    }

    // Case 3: only goal or nothing → nothing to derive upward
    didNormalizeRef.current = true;
  }, [
    modes.length,
    sel, // current selection snapshot
    task.id,
    setGoalId,
    setProjectId,
    effectiveProjectOfMilestone,
    effectiveGoalOfMilestone,
    effectiveGoalOfProject,
  ]);

  /* ─────────────────────────────────────────────────────────
     Change handlers (cascade up & down thereafter)
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
     Validate selections against filtered options (safety net)
     ───────────────────────────────────────────────────────── */
  useEffect(() => {
    const okG =
      sel.goalId == null || filtered.goals.some((g) => g.id === sel.goalId);
    const okP =
      sel.projectId == null ||
      filtered.projects.some((p) => p.id === sel.projectId);
    const okM =
      sel.milestoneId == null ||
      filtered.milestones.some((m) => m.id === sel.milestoneId);

    if (!okG) setGoalId(null);
    if (!okP) setProjectId(null);
    if (!okM) setMilestoneId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered.goals, filtered.projects, filtered.milestones]);

  /* ─────────────────────────────────────────────────────────
     Postpone helper (unchanged)
     ───────────────────────────────────────────────────────── */
  const [confirmOpen, setConfirmOpen] = useState(false);
  function getNextMonday(): string {
    const today = startOfToday();
    const day = today.getDay();
    const daysUntilNextMonday = (8 - day) % 7 || 7;
    const nextMonday = addDays(today, daysUntilNextMonday);
    return nextMonday.toLocaleDateString("en-CA");
  }
  const hasDue = Boolean(dueDate);
  const today = startOfToday();
  const nextMondayDate = parseISO(getNextMonday());
  let shouldShowPostpone = false;
  if (hasDue) {
    const d = parseISO(dueDate);
    const onOrAfterToday = isEqual(d, today) || isAfter(d, today);
    const beforeNextMonday = isBefore(d, nextMondayDate);
    shouldShowPostpone = onOrAfterToday && beforeNextMonday;
  }

  return (
    <>
      <div
        className="absolute top-0 left-0 w-full h-1.5 md:h-4 rounded-t-xl"
        style={{ backgroundColor: modeColor, opacity: 0.3 }}
      />
      <form
        onSubmit={handleSubmit}
        className="space-y-6 text-sm text-gray-900"
        onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
      >
        {/* Title */}
        <TitleInput title={title} setTitle={setTitle} />

        {/* Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
          {/* LEFT: Dates */}
          <div className="flex flex-col gap-6">
            <DueDateInput
              dueDate={dueDate}
              setDueDate={setDueDate}
              showPostpone={shouldShowPostpone}
            />
            <DueTimeInput dueTime={dueTime} setDueTime={setDueTime} />
          </div>

          {/* RIGHT: Smart lineage selects */}
          <div className="flex flex-col gap-4">
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
            <EditorAssigneeSelect
              modeId={modeId}
              assignedToId={assignedToId}
              onChange={setAssignedToId}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-6">
          {!confirmOpen ? (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="text-sm text-red-500 hover:underline font-semibold"
            >
              Delete Task
            </button>
          ) : (
            <ConfirmDialog
              open={confirmOpen}
              onClose={() => setConfirmOpen(false)}
              onConfirm={() => {
                onDelete();
                setConfirmOpen(false);
              }}
              title={`Delete task "${task.title}"?`}
              description="Are you sure you want to delete this task? This action cannot be undone."
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
