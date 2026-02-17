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

import EditorEntityInputs from "@/components/inputs/editor/EditorEntityInputs";

import { EntityKind, ParentType } from "@shared/api/batch/types/types";
import { computeParentOptions } from "./parentingUtils";

import { Goal } from "@shared/types/Goal";
import { Milestone } from "@shared/types/Milestone";
import { Project } from "@shared/types/Project";
import type { Mode } from "@shared/types/Mode";

import {
  filterEditorOptions,
  reconcileAfterChange,
  type EditorSelection,
  type EditorDatasets,
} from "@shared/lineage/editorFilter";

type ParentOption = { id: number; type: ParentType; title: string };

type EntityWithMode = {
  id: number;
  title: string;
  modeId?: number | null;
  mode?: number | { id: number } | null;
};

// safer empties (no `any`)
const EMPTY_ARR: readonly never[] = [];
const EMPTY_OBJ: Readonly<Record<string, never>> = Object.freeze({});

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
  const clearAll = useSelectionStore((s) => s.clearAll);

  // --- Store reads (avoid `any` by narrowing unknown shapes) ---
  const modesFromStore = useModeStore(
    (s) => (s as unknown as { modes?: Mode[] }).modes
  );
  const modes: Mode[] = modesFromStore ?? (EMPTY_ARR as unknown as Mode[]);

  const tasksByIdFromStore = useTaskStore((s) => {
    const st = s as unknown as {
      byId?: Record<number, EntityWithMode>;
      tasksById?: Record<number, EntityWithMode>;
    };
    return st.byId ?? st.tasksById;
  });
  const tasksById: Record<number, EntityWithMode> =
    tasksByIdFromStore ??
    (EMPTY_OBJ as unknown as Record<number, EntityWithMode>);
  const tasksArrFromStore = useTaskStore(
    (s) => (s as unknown as { tasks?: EntityWithMode[] }).tasks
  );
  const tasksArr: EntityWithMode[] =
    tasksArrFromStore ?? (EMPTY_ARR as unknown as EntityWithMode[]);

  const milestonesByIdFromStore = useMilestoneStore((s) => {
    const st = s as unknown as {
      byId?: Record<number, Milestone>;
      milestonesById?: Record<number, Milestone>;
    };
    return st.byId ?? st.milestonesById;
  });
  const milestonesById: Record<number, Milestone> =
    milestonesByIdFromStore ??
    (EMPTY_OBJ as unknown as Record<number, Milestone>);
  const milestonesArrFromStore = useMilestoneStore(
    (s) => (s as unknown as { milestones?: Milestone[] }).milestones
  );
  const milestonesArr: Milestone[] =
    milestonesArrFromStore ?? (EMPTY_ARR as unknown as Milestone[]);
  const milestonesByModeFromStore = useMilestoneStore(
    (s) =>
      (s as unknown as { byModeId?: Record<string | number, Milestone[]> })
        .byModeId
  );
  const milestonesByMode: Record<string | number, Milestone[]> =
    milestonesByModeFromStore ??
    (EMPTY_OBJ as unknown as Record<string | number, Milestone[]>);

  const projectsByIdFromStore = useProjectStore((s) => {
    const st = s as unknown as {
      byId?: Record<number, Project>;
      projectsById?: Record<number, Project>;
    };
    return st.byId ?? st.projectsById;
  });
  const projectsById: Record<number, Project> =
    projectsByIdFromStore ?? (EMPTY_OBJ as unknown as Record<number, Project>);
  const projectsArrFromStore = useProjectStore(
    (s) => (s as unknown as { projects?: Project[] }).projects
  );
  const projectsArr: Project[] =
    projectsArrFromStore ?? (EMPTY_ARR as unknown as Project[]);
  const projectsByModeFromStore = useProjectStore(
    (s) =>
      (s as unknown as { byModeId?: Record<string | number, Project[]> })
        .byModeId
  );
  const projectsByMode: Record<string | number, Project[]> =
    projectsByModeFromStore ??
    (EMPTY_OBJ as unknown as Record<string | number, Project[]>);

  const goalsByIdFromStore = useGoalStore((s) => {
    const st = s as unknown as {
      byId?: Record<number, Goal>;
      goalsById?: Record<number, Goal>;
    };
    return st.byId ?? st.goalsById;
  });
  const goalsById: Record<number, Goal> =
    goalsByIdFromStore ?? (EMPTY_OBJ as unknown as Record<number, Goal>);
  const goalsArrFromStore = useGoalStore(
    (s) => (s as unknown as { goals?: Goal[] }).goals
  );
  const goalsArr: Goal[] =
    goalsArrFromStore ?? (EMPTY_ARR as unknown as Goal[]);
  const goalsByModeFromStore = useGoalStore(
    (s) =>
      (s as unknown as { byModeId?: Record<string | number, Goal[]> }).byModeId
  );
  const goalsByMode: Record<string | number, Goal[]> =
    goalsByModeFromStore ??
    (EMPTY_OBJ as unknown as Record<string | number, Goal[]>);

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

    const addMode = (entity?: EntityWithMode) => {
      const mid =
        entity?.modeId ??
        (typeof entity?.mode === "object" ? entity.mode?.id : entity?.mode);
      if (typeof mid === "number") ids.add(mid);
    };

    selected.task.forEach((id: number) =>
      addMode(
        (tasksById[id] ?? tasksArr.find((t) => t.id === id)) as
          | EntityWithMode
          | undefined
      )
    );
    selected.milestone.forEach((id: number) =>
      addMode(
        (milestonesById[id] ??
          milestonesArr.find((m) => m.id === id)) as unknown as
          | EntityWithMode
          | undefined
      )
    );
    selected.project.forEach((id: number) =>
      addMode(
        (projectsById[id] ??
          projectsArr.find((p) => p.id === id)) as unknown as
          | EntityWithMode
          | undefined
      )
    );
    selected.goal.forEach((id: number) =>
      addMode(
        (goalsById[id] ?? goalsArr.find((g) => g.id === id)) as unknown as
          | EntityWithMode
          | undefined
      )
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
  const resolvedModeId = sameMode || targetModeId != null ? selectedModeId : null;
  const modeColor =
    (resolvedModeId && modes.find((m) => m.id === resolvedModeId)?.color) ||
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
      sameMode,
      milestonesInMode: msInMode,
      projectsInMode: pjInMode,
      goalsInMode: glInMode,
    });
  }, [kinds, selected, sameMode, msInMode, pjInMode, glInMode]);

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
    <T extends { id: number; title: string }>(arr: T[]): T[] => {
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
        filtered.goals.filter((g: { id: number }) => eligibleGoalIds.has(g.id))
      ),
      projects: sortAlpha(
        filtered.projects.filter((p: { id: number }) =>
          eligibleProjectIds.has(p.id)
        )
      ),
      milestones: sortAlpha(
        filtered.milestones.filter((m: { id: number }) =>
          eligibleMilestoneIds.has(m.id)
        )
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
        milestonesArr.find((x) => x.id === selMilestoneId) ??
        filteredSorted.milestones.find(
          (x: { id: number }) => x.id === selMilestoneId
        );

      setTargetParent(
        m ? { id: m.id, type: "milestone", title: m.title } : null
      );
      return;
    }

    if (selProjectId != null) {
      const p =
        projectsById[selProjectId] ??
        projectsArr.find((x) => x.id === selProjectId) ??
        filteredSorted.projects.find(
          (x: { id: number }) => x.id === selProjectId
        );

      setTargetParent(p ? { id: p.id, type: "project", title: p.title } : null);
      return;
    }

    if (selGoalId != null) {
      const g =
        goalsById[selGoalId] ??
        goalsArr.find((x) => x.id === selGoalId) ??
        filteredSorted.goals.find((x: { id: number }) => x.id === selGoalId);

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

  const onModeChange = useCallback((nextModeId: number) => {
    setTargetModeId(nextModeId);
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

      clearAll();
    } finally {
      setIsBatchEditorOpen(false);
    }
  };

  const canApply =
    Boolean(targetParent) ||
    Boolean(targetModeId) ||
    Boolean(setToday || dueDate || dueTime || clearDueDate) ||
    Boolean(markComplete) ||
    Boolean(doDelete);

  return (
    <Dialog.Root open={isBatchEditorOpen} onOpenChange={setIsBatchEditorOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/30 backdrop-blur-[2px]" />
        <Dialog.Content
          className="fixed left-1/2 top-16 z-[250] w-[92vw] max-w-3xl -translate-x-1/2 rounded-xl bg-white shadow-xl"
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
            className="absolute left-0 top-0 h-1.5 w-full rounded-t-xl md:h-4"
            style={{ backgroundColor: modeColor }}
          />
          <div className="flex items-center justify-between px-6 pb-3 pt-5">
            <Dialog.Title className="text-xl font-bold tracking-tight md:text-2xl">
              Batch Edit{" "}
              <span className="text-gray-500">({totalCount} Selected)</span>
            </Dialog.Title>
            <button
              className="rounded p-2 hover:bg-gray-100"
              onClick={() => setIsBatchEditorOpen(false)}
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="px-6 pb-6">
            <div className="grid grid-cols-1 gap-x-12 gap-y-10 md:grid-cols-2">
              <div className="order-2 flex flex-col gap-8 md:order-1">
                <section>
                  <div className="max-w-sm">
                    <EditorModeSelect
                      modes={modes}
                      modeId={sameMode || targetModeId != null ? (selectedModeId ?? modes[0]?.id ?? 0) : null}
                      onChange={onModeChange}
                      modeColor={modeColor}
                      placeholder="---"
                    />
                  </div>
                </section>

                <section>
                  <div className="mb-2 flex items-center justify-between">
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
                          className="mt-2 text-xs text-gray-600 underline"
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

              <div className="order-1 flex flex-col gap-8 md:order-2">
                <section>
                  <h3 className="mb-2 font-semibold">Schedule</h3>
                  <div className="mb-3 flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-blue-800">
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
                            setClearDueDate(false);
                            setSetToday(true);
                            setDueDate(todayStr());
                          } else {
                            setSetToday(false);
                          }
                        }}
                      />
                      Set to Today
                    </label>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
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
                            setSetToday(false);
                            setDueDate("");
                            setDueTime("");
                          }
                        }}
                      />
                      Clear due date
                    </label>
                  </div>
                  <div className="mb-3 flex items-center gap-2">
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
                      className="rounded border px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Due time</span>
                    <input
                      type="time"
                      value={dueTime}
                      onChange={(e) => setDueTime(e.target.value)}
                      className="rounded border px-2 py-1 text-sm"
                    />
                  </div>
                </section>

                <section>
                  <h3 className="mb-2 font-semibold">Bulk actions</h3>
                  <div className="flex flex-col gap-3 text-sm">
                    <label className="flex items-center gap-2 font-semibold text-green-800">
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

                    <label className="flex items-center gap-2 font-semibold text-red-700">
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

            <div className="flex items-center justify-end gap-3 pt-8">
              <button
                type="button"
                className="rounded-md bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
                onClick={() => setIsBatchEditorOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onApply}
                disabled={!canApply || isApplying}
                className="rounded-md px-5 py-2 text-sm font-semibold disabled:opacity-50"
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
