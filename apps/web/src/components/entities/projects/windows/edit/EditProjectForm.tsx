"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";

import type { Mode } from "@shared/types/Mode";
import type { Goal } from "@shared/types/Goal";
import type { Project } from "@shared/types/Project";

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

/** Unified editor orchestration */
import EditorEntityInputs from "@/components/inputs/editor/EditorEntityInputs";
import EditorAssigneeSelect from "@/components/inputs/editor/EditorAssigneeSelect";
import {
  filterEditorOptions,
  reconcileAfterChange,
  type EditorSelection,
  type EditorDatasets,
} from "@shared/lineage/editorFilter";

import { projectEffectiveGoalId } from "@shared/lineage/effective";

type Props = {
  title: string;
  modeId: number;
  goalId: number | null | undefined; // explicit goal on the project (top-level)
  parentId: number | null | undefined; // parent project id (if nested)

  dueDate: string;
  dueTime: string;
  assignedToId: number | null;

  setTitle: (val: string) => void;
  setModeId: (id: number) => void;
  setGoalId: (id: number | null | undefined) => void;
  setParentId: (id: number | null | undefined) => void;
  setDueDate: (val: string) => void;
  setDueTime: (val: string) => void;
  setAssignedToId: (id: number | null) => void;

  handleSubmit: (e?: React.FormEvent) => void;
  onCancel: () => void;
  onDelete: () => void;

  modes: Mode[];
  goals: Goal[];
  projects: Project[];
  projectId: number;
};

export default function EditProjectForm({
  title,
  dueDate,
  dueTime,
  assignedToId,
  setDueDate,
  setDueTime,
  setAssignedToId,
  modeId,
  goalId,
  parentId,
  setTitle,
  setModeId,
  setGoalId,
  setParentId,
  handleSubmit,
  onCancel,
  onDelete,
  modes,
  goals,
  projects,
  projectId,
}: Props) {
  /* ─────────────────────────────────────────────────────────
     Styling
     ───────────────────────────────────────────────────────── */
  const selectedMode = modes.find((m) => m.id === modeId);
  const modeColor = selectedMode?.color || "#333";
  const textColor = getContrastingText(modeColor);

  /* ─────────────────────────────────────────────────────────
     Local maps + effective goal
     ───────────────────────────────────────────────────────── */
  const projectsById = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );

  // When a parent project is chosen, derive goal from its lineage.
  // Otherwise, use the project’s own goalId.
  const displayGoalId: number | null = useMemo(() => {
    if (parentId != null) {
      return projectEffectiveGoalId(parentId, projectsById);
    }
    return goalId ?? null;
  }, [parentId, goalId, projectsById]);

  /* ─────────────────────────────────────────────────────────
     Editor selection + datasets
     ───────────────────────────────────────────────────────── */
  const sel = useMemo<EditorSelection>(
    () => ({
      modeId,
      goalId: displayGoalId,
      projectId: parentId ?? null, // parent project in editor selection
      milestoneId: null,
    }),
    [modeId, displayGoalId, parentId]
  );

  const datasets = useMemo<EditorDatasets>(
    () => ({
      modes,
      goals,
      projects,
      milestones: [],
    }),
    [modes, goals, projects]
  );

  // Base filtered options (mode/goal/project scoping) from the shared editor logic
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

  /* ─────────────────────────────────────────────────────────
     Parent project candidates
     - cannot be self
     - cannot be any descendant of this project (no cycles)
     ───────────────────────────────────────────────────────── */
  const isDescendantOf = useCallback(
    (candidateId: number, ancestorId: number) => {
      if (candidateId === ancestorId) return true;
      const seen = new Set<number>();
      let cur = projectsById.get(candidateId);
      while (cur && cur.parentId != null) {
        if (seen.has(cur.parentId)) break;
        if (cur.parentId === ancestorId) return true;
        seen.add(cur.parentId);
        cur = projectsById.get(cur.parentId);
      }
      return false;
    },
    [projectsById]
  );

  const parentCandidates = useMemo<Project[]>(() => {
    return filteredSorted.projects.filter((p) => {
      if (p.id === projectId) return false;
      if (isDescendantOf(p.id, projectId)) return false;
      return true;
    });
  }, [filteredSorted.projects, projectId, isDescendantOf]);

  const parentCandidatesSorted = useMemo(
    () => sortAlpha(parentCandidates),
    [parentCandidates, sortAlpha]
  );

  /* ─────────────────────────────────────────────────────────
     Apply helper – map EditorSelection → stored shape
     XOR rule:
       - If a parent project is chosen, store parentId and clear goalId.
       - If no parent, store goalId as the project’s goal.
     ───────────────────────────────────────────────────────── */
  const applyRec = useCallback(
    (rec: EditorSelection) => {
      if (rec.projectId != null) {
        // Nested project – parent chosen dominates goal
        setParentId(rec.projectId);
        setGoalId(null);
      } else {
        // Top-level project – goal only
        setParentId(null);
        setGoalId(rec.goalId);
      }
    },
    [setGoalId, setParentId]
  );

  /* ─────────────────────────────────────────────────────────
     Initial normalisation
     - If a parent project is already set, ensure goalId matches its lineage.
     - If only goalId is set, leave as-is.
     Runs once per projectId.
     ───────────────────────────────────────────────────────── */
  const didNormalizeRef = useRef(false);
  useEffect(() => {
    didNormalizeRef.current = false;
  }, [projectId]);

  useEffect(() => {
    if (didNormalizeRef.current) return;
    if (!modes.length) return;

    if (parentId != null) {
      const effGoalId = projectEffectiveGoalId(parentId, projectsById);
      if (effGoalId !== goalId) {
        setGoalId(effGoalId);
      }
      didNormalizeRef.current = true;
      return;
    }

    // Only goal or nothing – nothing extra to derive up-front
    didNormalizeRef.current = true;
  }, [modes.length, parentId, goalId, projectsById, setGoalId]);

  /* ─────────────────────────────────────────────────────────
     Change handlers (cascade up & down via editorFilter)
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

  /* ─────────────────────────────────────────────────────────
     Safety: clear stored IDs that fall out of scope
     ───────────────────────────────────────────────────────── */
  useEffect(() => {
    const okGoal =
      displayGoalId == null ||
      filteredSorted.goals.some((g) => g.id === displayGoalId);
    const okParent =
      parentId == null || parentCandidatesSorted.some((p) => p.id === parentId);

    if (!okGoal) setGoalId(null);
    if (!okParent) setParentId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredSorted.goals, parentCandidatesSorted]);

  /* ─────────────────────────────────────────────────────────
     Due helpers (same logic as before)
     ───────────────────────────────────────────────────────── */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const today = startOfToday();
  const nextMonday = useMemo(() => {
    const day = today.getDay();
    const daysUntilNextMonday = (8 - day) % 7 || 7;
    return addDays(today, daysUntilNextMonday);
  }, [today]);

  useEffect(() => {
    if (!dueDate && dueTime) setDueTime("");
  }, [dueDate, dueTime, setDueTime]);

  const shouldShowPostpone = useMemo(() => {
    if (!dueDate) return false;
    const d = parseISO(dueDate);
    const isOverdue = isBefore(d, today);
    const onOrAfterToday = isEqual(d, today) || isAfter(d, today);
    const beforeNextMonday = isBefore(d, nextMonday);
    return !isOverdue && onOrAfterToday && beforeNextMonday;
  }, [dueDate, today, nextMonday]);

  /* ─────────────────────────────────────────────────────────
     Render
     ───────────────────────────────────────────────────────── */
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
          {/* LEFT: dates */}
          <div className="flex flex-col gap-6">
            <DueDateInput
              dueDate={dueDate}
              setDueDate={setDueDate}
              showPostpone={shouldShowPostpone}
            />
            <DueTimeInput dueTime={dueTime} setDueTime={setDueTime} />
          </div>

          {/* RIGHT: smart lineage selects */}
          <div className="flex flex-col gap-4">
            <EditorEntityInputs
              variant="edit"
              modes={modes}
              goals={filteredSorted.goals}
              projects={parentCandidatesSorted}
              milestones={[]} // projects don’t pick milestones
              modeId={sel.modeId}
              goalId={sel.goalId}
              projectId={sel.projectId}
              milestoneId={null}
              onModeChange={onModeChange}
              onGoalChange={onGoalChange}
              onProjectChange={onProjectChange}
              onMilestoneChange={undefined}
              modeColor={modeColor}
              labels={{ project: "Parent Project" }}
              visible={{
                mode: true,
                goal: true,
                project: true,
                milestone: false,
              }}
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
              Delete Project
            </button>
          ) : (
            <ConfirmDialog
              open={confirmOpen}
              onClose={() => setConfirmOpen(false)}
              onConfirm={() => {
                onDelete();
                setConfirmOpen(false);
              }}
              title={`Delete project "${title}"?`}
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
