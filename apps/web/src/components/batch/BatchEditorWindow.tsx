"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useMemo, useState, useCallback } from "react";
import { X } from "lucide-react";

import { useBatchEditorStore } from "@/lib/store/useBatchEditorStore";
import { useSelectionStore } from "@/lib/store/useSelectionStore";
import { useBatchApply } from "@shared/api/batch/hooks/useBatchApply";
import EditorModeSelect from "@/components/inputs/editor/EditorModeSelect";

import { useModeStore } from "@shared/store/useModeStore";
import { useTaskStore } from "@shared/store/useTaskStore";
import { useMilestoneStore } from "@shared/store/useMilestoneStore";
import { useProjectStore } from "@shared/store/useProjectStore";
import { useGoalStore } from "@shared/store/useGoalStore";
import { getContrastingText } from "@shared/utils/getContrastingText";

import ModeInput from "@/components/timer/inputs/TimerModeSelect";
import EditorEntityInputs from "@/components/inputs/editor/EditorEntityInputs";

import { EntityKind, ParentType } from "@shared/api/batch/types/types";
import { computeParentOptions } from "./parentingUtils";

import { Goal } from "@shared/types/Goal";
import { Milestone } from "@shared/types/Milestone";
import { Project } from "@shared/types/Project";

import {
  filterEditorOptions,
  reconcileAfterChange,
  type EditorSelection,
  type EditorDatasets,
} from "@shared/lineage/editorFilter";

type ParentOption = { id: number; type: ParentType; title: string };

const EMPTY_ARR: any[] = [];
const EMPTY_OBJ: Record<string, any> = Object.freeze({});

function fromModeMapOrFilter<T extends { id: number; modeId?: number | null }>(
  byModeMap: Record<string | number, T[]>,
  all: T[],
  modeId: number | null
): T[] {
  if (!modeId) return [];
  const direct = byModeMap[modeId] || byModeMap[String(modeId)];
  if (Array.isArray(direct)) return direct;
  return all.filter((x) => (x?.modeId ?? null) === modeId);
}

const num = (v: unknown): number | null =>
  v === null || v === undefined || v === "" ? null : Number(v);

export default function BatchEditorWindow() {
  const { isBatchEditorOpen, setIsBatchEditorOpen } = useBatchEditorStore();

  const totalCount = useSelectionStore((s) => s.totalCount());
  const selected = useSelectionStore((s) => s.selected);
  const { apply, isApplying } = useBatchApply();
  const clearAll = useSelectionStore((s) => s.clearAll); // ⬅️ add this

  const modesFromStore = useModeStore((s: any) => s.modes);
  const modes = modesFromStore ?? EMPTY_ARR;

  const tasksByIdFromStore = useTaskStore((s: any) => s.byId ?? s.tasksById);
  const tasksById = tasksByIdFromStore ?? EMPTY_OBJ;
  const tasksArrFromStore = useTaskStore((s: any) => s.tasks);
  const tasksArr = tasksArrFromStore ?? EMPTY_ARR;

  const milestonesByIdFromStore = useMilestoneStore(
    (s: any) => s.byId ?? s.milestonesById
  );
  const milestonesById = milestonesByIdFromStore ?? EMPTY_OBJ;
  const milestonesArrFromStore = useMilestoneStore((s: any) => s.milestones);
  const milestonesArr = milestonesArrFromStore ?? EMPTY_ARR;
  const milestonesByModeFromStore = useMilestoneStore((s: any) => s.byModeId);
  const milestonesByMode = milestonesByModeFromStore ?? EMPTY_OBJ;

  const projectsByIdFromStore = useProjectStore(
    (s: any) => s.byId ?? s.projectsById
  );
  const projectsById = projectsByIdFromStore ?? EMPTY_OBJ;
  const projectsArrFromStore = useProjectStore((s: any) => s.projects);
  const projectsArr = projectsArrFromStore ?? EMPTY_ARR;
  const projectsByModeFromStore = useProjectStore((s: any) => s.byModeId);
  const projectsByMode = projectsByModeFromStore ?? EMPTY_OBJ;

  const goalsByIdFromStore = useGoalStore((s: any) => s.byId ?? s.goalsById);
  const goalsById = goalsByIdFromStore ?? EMPTY_OBJ;
  const goalsArrFromStore = useGoalStore((s: any) => s.goals);
  const goalsArr = goalsArrFromStore ?? EMPTY_ARR;
  const goalsByModeFromStore = useGoalStore((s: any) => s.byModeId);
  const goalsByMode = goalsByModeFromStore ?? EMPTY_OBJ;
  const [clearDueDate, setClearDueDate] = useState(false);

  const kinds = useMemo<EntityKind[]>(() => {
    const out: EntityKind[] = [];
    if (selected.task.size) out.push("task");
    if (selected.milestone.size) out.push("milestone");
    if (selected.project.size) out.push("project");
    if (selected.goal.size) out.push("goal");
    return out;
  }, [selected.task, selected.milestone, selected.project, selected.goal]);

  const { sameMode, onlyModeId } = useMemo(() => {
    const ids = new Set<number>();
    const addMode = (entity: any) => {
      const mid = entity?.modeId ?? entity?.mode?.id ?? entity?.mode;
      if (typeof mid === "number") ids.add(mid);
    };
    selected.task.forEach((id) =>
      addMode(tasksById[id] ?? tasksArr.find((t: any) => t.id === id))
    );
    selected.milestone.forEach((id) =>
      addMode(milestonesById[id] ?? milestonesArr.find((m: any) => m.id === id))
    );
    selected.project.forEach((id) =>
      addMode(projectsById[id] ?? projectsArr.find((p: any) => p.id === id))
    );
    selected.goal.forEach((id) =>
      addMode(goalsById[id] ?? goalsArr.find((g: any) => g.id === id))
    );
    const same = ids.size === 1;
    return {
      sameMode: same,
      onlyModeId: same ? [...ids][0] : (null as number | null),
    };
  }, [
    selected.task,
    selected.milestone,
    selected.project,
    selected.goal,
    tasksById,
    tasksArr,
    milestonesById,
    milestonesArr,
    projectsById,
    projectsArr,
    goalsById,
    goalsArr,
  ]);

  const [targetParent, setTargetParent] = useState<ParentOption | null>(null);
  const [targetModeId, setTargetModeId] = useState<number | null>(null);
  const [setToday, setSetToday] = useState(false);
  const [dueDate, setDueDate] = useState<string>("");
  const [dueTime, setDueTime] = useState<string>("");
  const [markComplete, setMarkComplete] = useState(false);
  const [doDelete, setDoDelete] = useState(false);

  const todayStr = () => new Date().toLocaleDateString("en-CA");

  const selectedModeId = targetModeId ?? onlyModeId ?? modes[0]?.id ?? null;
  const modeColor =
    (selectedModeId &&
      modes.find((m: any) => m.id === selectedModeId)?.color) ||
    "#333";
  const primaryFg = getContrastingText(modeColor);

  const effectiveModeId = targetModeId ?? onlyModeId ?? modes[0]?.id ?? null;

  const msInMode = useMemo(
    () =>
      fromModeMapOrFilter<Milestone>(
        milestonesByMode,
        milestonesArr,
        effectiveModeId
      ),
    [milestonesByMode, milestonesArr, effectiveModeId]
  );
  const pjInMode = useMemo(
    () =>
      fromModeMapOrFilter<Project>(
        projectsByMode,
        projectsArr,
        effectiveModeId
      ),
    [projectsByMode, projectsArr, effectiveModeId]
  );
  const glInMode = useMemo(
    () => fromModeMapOrFilter<Goal>(goalsByMode, goalsArr, effectiveModeId),
    [goalsByMode, goalsArr, effectiveModeId]
  );

  const { parentOptions, groupingReason } = useMemo(() => {
    return computeParentOptions({
      kinds,
      selected,
      effectiveModeId,
      sameMode,
      milestonesArr,
      projectsArr,
      goalsArr,
      milestonesById,
      projectsById,
      milestonesByMode: { [effectiveModeId ?? ""]: msInMode },
      projectsByMode: { [effectiveModeId ?? ""]: pjInMode },
      goalsByMode: { [effectiveModeId ?? ""]: glInMode },
    });
  }, [
    kinds,
    selected,
    effectiveModeId,
    sameMode,
    milestonesArr,
    projectsArr,
    goalsArr,
    milestonesById,
    projectsById,
    msInMode,
    pjInMode,
    glInMode,
  ]);

  const selectionIncludesGoal = kinds.includes("goal");
  const groupingEnabled =
    sameMode &&
    effectiveModeId != null &&
    parentOptions.length > 0 &&
    !selectionIncludesGoal;

  const eligibleGoalIds = useMemo(
    () =>
      new Set(parentOptions.filter((p) => p.type === "goal").map((p) => p.id)),
    [parentOptions]
  );
  const eligibleProjectIds = useMemo(
    () =>
      new Set(
        parentOptions.filter((p) => p.type === "project").map((p) => p.id)
      ),
    [parentOptions]
  );
  const eligibleMilestoneIds = useMemo(
    () =>
      new Set(
        parentOptions.filter((p) => p.type === "milestone").map((p) => p.id)
      ),
    [parentOptions]
  );

  const [selGoalId, setSelGoalId] = useState<number | null>(null);
  const [selProjectId, setSelProjectId] = useState<number | null>(null);
  const [selMilestoneId, setSelMilestoneId] = useState<number | null>(null);

  const projIdx = useMemo(() => {
    const m = new Map<number, Project>();
    for (const p of projectsArr) m.set(p.id, p);
    return m;
  }, [projectsArr]);

  const msIdx = useMemo(() => {
    const m = new Map<number, Milestone>();
    for (const x of milestonesArr) m.set(x.id, x);
    return m;
  }, [milestonesArr]);

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

  const effectiveProjectOfMilestone = useCallback(
    (msId: number | null): number | null => {
      if (msId == null) return null;
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

  const effectiveGoalOfMilestone = useCallback(
    (msId: number | null): number | null => {
      if (msId == null) return null;
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

  const datasets = useMemo<EditorDatasets>(
    () => ({
      modes,
      goals: glInMode,
      projects: pjInMode,
      milestones: msInMode,
    }),
    [modes, glInMode, pjInMode, msInMode]
  );

  const sel: EditorSelection = useMemo(
    () => ({
      modeId: num(effectiveModeId) ?? 0,
      goalId: num(selGoalId),
      projectId: num(selProjectId),
      milestoneId: num(selMilestoneId),
    }),
    [effectiveModeId, selGoalId, selProjectId, selMilestoneId]
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
      goals: sortAlpha(
        filtered.goals.filter((g: any) => eligibleGoalIds.has(g.id))
      ),
      projects: sortAlpha(
        filtered.projects.filter((p: any) => eligibleProjectIds.has(p.id))
      ),
      milestones: sortAlpha(
        filtered.milestones.filter((m: any) => eligibleMilestoneIds.has(m.id))
      ),
    }),
    [
      filtered,
      eligibleGoalIds,
      eligibleProjectIds,
      eligibleMilestoneIds,
      sortAlpha,
    ]
  );

  useEffect(() => {
    if (selMilestoneId != null) {
      const m =
        milestonesById[selMilestoneId] ??
        milestonesArr.find((x: any) => x.id === selMilestoneId) ??
        filteredSorted.milestones.find((x: any) => x.id === selMilestoneId);
      setTargetParent(
        m ? { id: m.id, type: "milestone", title: m.title } : null
      );
      return;
    }

    if (selProjectId != null) {
      const p =
        projectsById[selProjectId] ??
        projectsArr.find((x: any) => x.id === selProjectId) ??
        filteredSorted.projects.find((x: any) => x.id === selProjectId);
      setTargetParent(p ? { id: p.id, type: "project", title: p.title } : null);
      return;
    }

    if (selGoalId != null) {
      const g =
        goalsById[selGoalId] ??
        goalsArr.find((x: any) => x.id === selGoalId) ??
        filteredSorted.goals.find((x: any) => x.id === selGoalId);
      setTargetParent(g ? { id: g.id, type: "goal", title: g.title } : null);
      return;
    }

    setTargetParent(null);
  }, [
    selGoalId,
    selProjectId,
    selMilestoneId,
    goalsById,
    projectsById,
    milestonesById,
    goalsArr,
    projectsArr,
    milestonesArr,
    filteredSorted.goals,
    filteredSorted.projects,
    filteredSorted.milestones,
  ]);

  useEffect(() => {
    setSelGoalId(null);
    setSelProjectId(null);
    setSelMilestoneId(null);
    setTargetParent(null);
  }, [effectiveModeId, isBatchEditorOpen]);

  useEffect(() => {
    if (isBatchEditorOpen) document.body.classList.add("modal-open");
    else document.body.classList.remove("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [isBatchEditorOpen]);

  useEffect(() => {
    if (!isBatchEditorOpen) {
      setTargetParent(null);
      setTargetModeId(null);
      setSetToday(false);
      setDueDate("");
      setDueTime("");
      setClearDueDate(false);
      setMarkComplete(false);
      setDoDelete(false);
    }
  }, [isBatchEditorOpen, sameMode, onlyModeId, effectiveModeId]);

  // replace applyRec with this
  const applyRec = useCallback(
    (patch: Partial<EditorSelection>) => {
      const base: EditorSelection = {
        modeId: num(effectiveModeId) ?? 0,
        goalId: num(selGoalId),
        projectId: num(selProjectId),
        milestoneId: num(selMilestoneId),
      };
      const next = reconcileAfterChange(base, patch, datasets);

      if ("modeId" in patch) {
        setTargetModeId(next.modeId ?? null);
      }

      setSelGoalId(next.goalId ?? null);
      setSelProjectId(next.projectId ?? null);
      setSelMilestoneId(next.milestoneId ?? null);
    },
    [effectiveModeId, selGoalId, selProjectId, selMilestoneId, datasets]
  );

  // keep other handlers the same, but ensure mode change is explicit
  const onModeChange = useCallback((nextModeId: number) => {
    // store the explicit target mode for this batch
    setTargetModeId(nextModeId);

    // reset any parent selection so it recalculates under the new mode
    setSelGoalId(null);
    setSelProjectId(null);
    setSelMilestoneId(null);
    setTargetParent(null);
  }, []);

  const onGoalChange = useCallback(
    (idRaw: number | string | null) => {
      const id = num(idRaw);
      applyRec({ goalId: id, projectId: null, milestoneId: null });
    },
    [applyRec]
  );

  const onProjectChange = useCallback(
    (idRaw: number | string | null) => {
      const id = num(idRaw);
      const effGoal = effectiveGoalOfProject(id);
      applyRec({ projectId: id, goalId: effGoal, milestoneId: null });
    },
    [applyRec, effectiveGoalOfProject]
  );

  const onMilestoneChange = useCallback(
    (idRaw: number | string | null) => {
      const id = num(idRaw);
      const effProj = effectiveProjectOfMilestone(id);
      const effGoal = effectiveGoalOfMilestone(id);
      applyRec({ milestoneId: id, projectId: effProj, goalId: effGoal });
    },
    [applyRec, effectiveProjectOfMilestone, effectiveGoalOfMilestone]
  );
  // tighten the apply step so it skips no-op mode changes
  const onApply = async () => {
    const shouldChangeMode =
      targetModeId != null && targetModeId !== (onlyModeId ?? null);

    try {
      await apply({
        selected,
        targetModeId: shouldChangeMode ? targetModeId : null,
        targetParent,
        setToday,
        dueDate: clearDueDate ? "" : dueDate,
        dueTime: clearDueDate ? "" : dueTime,
        clearDueDate,
        markComplete,
        doDelete,
      });

      // 🔹 After a successful apply, clear selection
      clearAll();
    } finally {
      // 🔹 Always close the batch editor UI
      setIsBatchEditorOpen(false);
    }
  };

  const canApply =
    Boolean(targetParent) ||
    Boolean(targetModeId) ||
    Boolean(setToday || dueDate || dueTime || clearDueDate) || // ✅ include it
    Boolean(markComplete) ||
    Boolean(doDelete);

  return (
    <Dialog.Root open={isBatchEditorOpen} onOpenChange={setIsBatchEditorOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[90]" />
        <Dialog.Content
          className="fixed top-16 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-xl w-[92vw] max-w-3xl z-[250]"
          data-batch-ui="true"
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              (e.target as HTMLElement).tagName !== "TEXTAREA"
            ) {
              e.preventDefault();
            }
          }}
        >
          <div
            className="absolute top-0 left-0 w-full h-1.5 md:h-4 rounded-t-xl"
            style={{ backgroundColor: modeColor }}
          />
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <Dialog.Title className="text-xl md:text-2xl font-bold tracking-tight">
              Batch Edit{" "}
              <span className="text-gray-500">({totalCount} Selected)</span>
            </Dialog.Title>
            <button
              className="p-2 rounded hover:bg-gray-100"
              onClick={() => setIsBatchEditorOpen(false)}
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="px-6 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
              <div className="flex flex-col gap-8 order-2 md:order-1">
                <section>
                  <div className="max-w-sm">
                    <EditorModeSelect
                      modes={modes}
                      modeId={selectedModeId ?? modes[0]?.id ?? 0}
                      onChange={onModeChange}
                      modeColor={modeColor}
                    />
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Group under</h3>
                    {!groupingEnabled && (
                      <span className="text-xs text-gray-500">
                        {selectionIncludesGoal
                          ? "Goals can’t have parents"
                          : groupingReason || "Requires single-mode selection."}
                      </span>
                    )}
                  </div>

                  {groupingEnabled &&
                    filteredSorted.goals.length === 0 &&
                    filteredSorted.projects.length === 0 &&
                    filteredSorted.milestones.length === 0 && (
                      <div className="text-sm text-gray-500">
                        No eligible parents in this mode.
                      </div>
                    )}

                  {groupingEnabled && (
                    <div className="max-w-sm">
                      <EditorEntityInputs
                        variant="batch"
                        modes={modes}
                        goals={filteredSorted.goals}
                        projects={filteredSorted.projects}
                        milestones={filteredSorted.milestones}
                        modeId={selectedModeId ?? 0}
                        goalId={selGoalId}
                        projectId={selProjectId}
                        milestoneId={selMilestoneId}
                        onModeChange={onModeChange}
                        onGoalChange={onGoalChange}
                        onProjectChange={onProjectChange}
                        onMilestoneChange={onMilestoneChange}
                        modeColor={modeColor}
                        visible={{
                          mode: false,
                          goal: filteredSorted.goals.length > 0,
                          project: filteredSorted.projects.length > 0,
                          milestone: filteredSorted.milestones.length > 0,
                        }}
                        labels={{
                          goal: "Goal",
                          project: "Project",
                          milestone: "Milestone",
                        }}
                      />
                      {(selGoalId || selProjectId || selMilestoneId) && (
                        <button
                          type="button"
                          className="text-xs underline text-gray-600 mt-2"
                          onClick={() => {
                            onGoalChange(null);
                            onProjectChange(null);
                            onMilestoneChange(null);
                            setTargetParent(null);
                          }}
                        >
                          Clear parent selection
                        </button>
                      )}
                    </div>
                  )}
                </section>
              </div>

              <div className="flex flex-col gap-8 order-1 md:order-2">
                <section>
                  <h3 className="font-semibold mb-2">Schedule</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <label className="flex items-center gap-2 text-sm text-blue-800 font-semibold">
                      <input
                        type="checkbox"
                        checked={setToday}
                        onChange={(e) => {
                          const v = e.target.checked;

                          if (markComplete || doDelete) {
                            setSetToday(false);
                            return;
                          }

                          if (v) {
                            setClearDueDate(false); // ✅ mutually exclusive
                            setSetToday(true);
                            setDueDate(todayStr());
                          } else {
                            setSetToday(false);
                          }
                        }}
                      />
                      Set to Today
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                      <input
                        type="checkbox"
                        checked={clearDueDate}
                        onChange={(e) => {
                          const v = e.target.checked;

                          if (markComplete || doDelete) {
                            setClearDueDate(false);
                            return;
                          }

                          setClearDueDate(v);

                          if (v) {
                            setSetToday(false); // ✅ mutually exclusive
                            setDueDate("");
                            setDueTime("");
                          }
                        }}
                      />
                      Clear due date
                    </label>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm text-gray-600">Due date</span>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDueDate(v);
                        if (!markComplete && !doDelete)
                          setSetToday(v === todayStr());
                      }}
                      className="border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Due time</span>
                    <input
                      type="time"
                      value={dueTime}
                      onChange={(e) => setDueTime(e.target.value)}
                      className="border rounded px-2 py-1 text-sm"
                    />
                  </div>
                </section>

                <section>
                  <h3 className="font-semibold mb-2">Bulk actions</h3>
                  <div className="flex flex-col gap-3 text-sm">
                    <label className="flex items-center gap-2 text-green-800 font-semibold">
                      <input
                        type="checkbox"
                        checked={markComplete}
                        onChange={(e) => {
                          const v = e.target.checked;
                          setMarkComplete(v);
                          if (v) {
                            setDoDelete(false);
                            setSetToday(false);
                          }
                        }}
                      />
                      Mark all as complete (irreversible)
                    </label>

                    <label className="flex items-center gap-2 text-red-700 font-semibold">
                      <input
                        type="checkbox"
                        checked={doDelete}
                        onChange={(e) => {
                          const v = e.target.checked;
                          setDoDelete(v);
                          if (v) {
                            setMarkComplete(false);
                            setSetToday(false);
                          }
                        }}
                      />
                      Delete all (irreversible)
                    </label>
                  </div>
                </section>
              </div>
            </div>

            <div className="flex justify-end items-center gap-3 pt-8">
              <button
                type="button"
                className="px-4 py-2 text-sm rounded-md bg-gray-200 hover:bg-gray-300"
                onClick={() => setIsBatchEditorOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onApply}
                disabled={!canApply || isApplying}
                className="px-5 py-2 text-sm font-semibold rounded-md disabled:opacity-50"
                style={{ backgroundColor: modeColor, color: primaryFg }}
              >
                {isApplying ? "Applying…" : "Apply"}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
