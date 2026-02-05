"use client";

import { useEffect, useMemo } from "react";

import { Mode } from "@shared/types/Mode";
import { Goal } from "@shared/types/Goal";
import { Project } from "@shared/types/Project";
import { Milestone } from "@shared/types/Milestone";
import { Task } from "@shared/types/Task";

import {
  filterEditorOptions,
  type EditorSelection,
  type EditorDatasets,
} from "@shared/lineage/editorFilter";

import {
  makeProjectMaps,
  makeMilestoneMaps,
  milestoneEffectiveLineage,
  projectEffectiveLineage,
} from "@shared/lineage/effective";

import { getContrastingText } from "@shared/utils/getContrastingText";
import TimerEntityInputs from "@/components/timer/inputs/TimerEntityInputs";
import { Check } from "lucide-react";

type Props = {
  modes: Mode[];
  goals: Goal[];
  projects: Project[];
  milestones: Milestone[];
  tasks: Task[];

  selectedMode: Mode | "All";
  modeColor: string;

  modeId: number;
  setModeId: (id: number) => void;
  goalId: number | null;
  setGoalId: (id: number | null) => void;
  projectId: number | null;
  setProjectId: (id: number | null) => void;
  milestoneId: number | null;
  setMilestoneId: (id: number | null) => void;
  taskId: number | null;
  setTaskId: (id: number | null) => void;

  showSwitch: boolean;
  onSwitchToSelection: () => void;

  onRequestFilterMode?: (modeId: number) => void;

  isActiveSession: boolean;
  isCompleting: boolean;
  onComplete: () => void;

  completeLabelTitle: string;
};

// ─────────────────────────────────────────────
// Local helpers
// ─────────────────────────────────────────────

/**
 * Your runtime tasks appear to carry optional linkage fields (goalId/projectId/milestoneId),
 * but the shared Task type doesn’t include them (hence the previous `any`).
 *
 * This keeps things type-safe without using `any`.
 */
type TaskWithLinks = Task & {
  goalId?: number | null;
  projectId?: number | null;
  milestoneId?: number | null;
};

function projectIsDescendantOrSelf(
  candidateId: number,
  ancestorId: number,
  byId: Map<number, Project>,
): boolean {
  if (candidateId === ancestorId) return true;
  const seen = new Set<number>();
  let cur: Project | null = byId.get(candidateId) ?? null;

  while (cur) {
    const pid = (cur.parentId ?? null) as number | null;
    if (pid == null || seen.has(pid)) break;
    if (pid === ancestorId) return true;
    seen.add(pid);
    cur = byId.get(pid) ?? null;
  }

  return false;
}

function milestoneIsDescendantOrSelf(
  candidateId: number,
  ancestorId: number,
  byId: Map<number, Milestone>,
): boolean {
  if (candidateId === ancestorId) return true;
  const seen = new Set<number>();
  let cur: Milestone | null = byId.get(candidateId) ?? null;

  while (cur) {
    const pid = (cur.parentId ?? null) as number | null;
    if (pid == null || seen.has(pid)) break;
    if (pid === ancestorId) return true;
    seen.add(pid);
    cur = byId.get(pid) ?? null;
  }

  return false;
}

export default function TimerSelectionCard({
  modes,
  goals,
  projects,
  milestones,
  tasks,
  selectedMode,
  modeColor,
  modeId,
  setModeId,
  goalId,
  setGoalId,
  projectId,
  setProjectId,
  milestoneId,
  setMilestoneId,
  taskId,
  setTaskId,
  showSwitch,
  onSwitchToSelection,
  onRequestFilterMode,
  isActiveSession,
  isCompleting,
  onComplete,
  completeLabelTitle,
}: Props) {
  // ─────────────────────────────────────────────
  // Derived mode + editor selection
  // ─────────────────────────────────────────────

  const selectedModeId: number | null =
    selectedMode &&
    selectedMode !== "All" &&
    typeof (selectedMode as Mode).id === "number"
      ? (selectedMode as Mode).id
      : Array.isArray(modes) && modes.length > 0
        ? modes[0].id
        : null;

  const effectiveModeId =
    typeof modeId === "number" && modeId !== -1
      ? modeId
      : (selectedModeId ?? -1);

  const editorSelection = useMemo<EditorSelection>(
    () => ({
      modeId: effectiveModeId,
      goalId,
      projectId,
      milestoneId,
    }),
    [effectiveModeId, goalId, projectId, milestoneId],
  );

  const editorDatasets = useMemo<EditorDatasets>(
    () => ({
      modes,
      goals,
      projects,
      milestones,
    }),
    [modes, goals, projects, milestones],
  );

  const filtered = useMemo(
    () => filterEditorOptions(editorSelection, editorDatasets),
    [editorSelection, editorDatasets],
  );

  const projMaps = useMemo(() => makeProjectMaps(projects), [projects]);
  const msMaps = useMemo(() => makeMilestoneMaps(milestones), [milestones]);

  // Treat incoming tasks as TaskWithLinks for this component’s needs
  const tasksWithLinks = useMemo(() => tasks as TaskWithLinks[], [tasks]);

  const tasksById = useMemo(
    () => new Map(tasksWithLinks.map((t) => [t.id, t])),
    [tasksWithLinks],
  );

  // ─────────────────────────────────────────────
  // Scoped lists (purely derived – no normalization here)
  // ─────────────────────────────────────────────

  const tasksScoped = useMemo(() => {
    if (effectiveModeId == null || effectiveModeId === -1) return [];

    const tInMode = tasksWithLinks.filter((t) => t.modeId === effectiveModeId);

    if (milestoneId != null) {
      return tInMode.filter((t) => {
        const tMs = t.milestoneId ?? null;
        if (tMs == null) return false;
        return milestoneIsDescendantOrSelf(tMs, milestoneId, msMaps.byId);
      });
    }

    if (projectId != null) {
      return tInMode.filter((t) => {
        const tidMs = t.milestoneId ?? null;
        const tidPr = t.projectId ?? null;

        if (tidPr != null) {
          if (projectIsDescendantOrSelf(tidPr, projectId, projMaps.byId)) {
            return true;
          }
        }

        if (tidMs != null) {
          const effMs = milestoneEffectiveLineage(
            tidMs,
            msMaps.byId,
            projMaps.byId,
          );
          const effProjId = effMs.projectId ?? null;
          if (
            effProjId != null &&
            projectIsDescendantOrSelf(effProjId, projectId, projMaps.byId)
          ) {
            return true;
          }
        }

        return false;
      });
    }

    if (goalId != null) {
      return tInMode.filter((t) => {
        const tidGo = t.goalId ?? null;
        const tidPr = t.projectId ?? null;
        const tidMs = t.milestoneId ?? null;

        if (tidGo === goalId) return true;

        if (tidMs != null) {
          const effMs = milestoneEffectiveLineage(
            tidMs,
            msMaps.byId,
            projMaps.byId,
          );
          if (effMs.goalId === goalId) return true;
        }

        if (tidPr != null) {
          const effPr = projectEffectiveLineage(tidPr, projMaps.byId);
          if (effPr.goalId === goalId) return true;
        }

        return false;
      });
    }

    return tInMode;
  }, [
    tasksWithLinks,
    effectiveModeId,
    goalId,
    projectId,
    milestoneId,
    projMaps.byId,
    msMaps.byId,
  ]);

  const goalsScoped = filtered.goals;
  const projectsScoped = filtered.projects;
  const milestonesScoped = filtered.milestones;

  const collator = useMemo(
    () => new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }),
    [],
  );

  const sortAlpha = useMemo(
    () =>
      <T extends { title: string }>(arr: T[]): T[] => {
        const none = arr.find((x) => x.title === "None");
        const rest = arr.filter(
          (x) => x.title !== "None" && !x.title.startsWith("Create"),
        );
        const create = arr.filter((x) => x.title.startsWith("Create"));
        return [
          ...(none ? [none] : []),
          ...[...rest].sort((a, b) => collator.compare(a.title, b.title)),
          ...create,
        ];
      },
    [collator],
  );

  const goalsSorted = useMemo(
    () => sortAlpha(goalsScoped),
    [goalsScoped, sortAlpha],
  );
  const projectsSorted = useMemo(
    () => sortAlpha(projectsScoped),
    [projectsScoped, sortAlpha],
  );
  const milestonesSorted = useMemo(
    () => sortAlpha(milestonesScoped),
    [milestonesScoped, sortAlpha],
  );
  const tasksSorted = useMemo(
    () => sortAlpha(tasksScoped),
    [tasksScoped, sortAlpha],
  );

  const tasksWithSelected = useMemo(() => {
    if (taskId == null) return tasksSorted;

    const alreadyThere = tasksSorted.some((t) => t.id === taskId);
    if (alreadyThere) return tasksSorted;

    const selected = tasksById.get(taskId);
    if (!selected) return tasksSorted;

    return sortAlpha([...tasksSorted, selected]);
  }, [taskId, tasksSorted, tasksById, sortAlpha]);

  const projectsWithSelected = useMemo(() => {
    if (projectId == null) return projectsSorted;

    const alreadyThere = projectsSorted.some((p) => p.id === projectId);
    if (alreadyThere) return projectsSorted;

    const selected = projects.find((p) => p.id === projectId);
    if (!selected) return projectsSorted;

    return sortAlpha([...projectsSorted, selected]);
  }, [projectId, projectsSorted, projects, sortAlpha]);

  const milestonesWithSelected = useMemo(() => {
    if (milestoneId == null) return milestonesSorted;

    const alreadyThere = milestonesSorted.some((m) => m.id === milestoneId);
    if (alreadyThere) return milestonesSorted;

    const selected = milestones.find((m) => m.id === milestoneId);
    if (!selected) return milestonesSorted;

    return sortAlpha([...milestonesSorted, selected]);
  }, [milestoneId, milestonesSorted, milestones, sortAlpha]);

  // ─────────────────────────────────────────────
  // Debug logging
  // ─────────────────────────────────────────────

  useEffect(() => {
    console.log("[TimerSelectionCard] render snapshot", {
      selectedModeKind: selectedMode === "All" ? "All" : "Single",
      selectedModeId,
      modeId,
      effectiveModeId,
      selection: { goalId, projectId, milestoneId, taskId },
      showSwitch,
      counts: {
        goalsScoped: goalsScoped.length,
        projectsScoped: projectsScoped.length,
        milestonesScoped: milestonesScoped.length,
        tasksScoped: tasksScoped.length,
        goalsSorted: goalsSorted.length,
        projectsSorted: projectsSorted.length,
        milestonesSorted: milestonesSorted.length,
        tasksSorted: tasksSorted.length,
        tasksWithSelected: tasksWithSelected.length,
        projectsWithSelected: projectsWithSelected.length,
        milestonesWithSelected: milestonesWithSelected.length,
      },
    });
  }, [
    selectedMode,
    selectedModeId,
    modeId,
    effectiveModeId,
    goalId,
    projectId,
    milestoneId,
    taskId,
    goalsScoped.length,
    projectsScoped.length,
    milestonesScoped.length,
    tasksScoped.length,
    goalsSorted.length,
    projectsSorted.length,
    milestonesSorted.length,
    tasksSorted.length,
    tasksWithSelected.length,
    projectsWithSelected.length,
    milestonesWithSelected.length,
    showSwitch,
  ]);

  // ─────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────

  const handleModeChange = (id: number) => {
    console.log("[TimerSelectionCard] handleModeChange", {
      prevModeId: modeId,
      nextModeId: id,
    });
    setModeId(id);
    if (onRequestFilterMode) onRequestFilterMode(id);
  };

  const handleGoalChange = (id: number | null) => {
    console.log("[TimerSelectionCard] handleGoalChange", {
      prevGoalId: goalId,
      nextGoalId: id,
    });
    setGoalId(id);
    setProjectId(null);
    setMilestoneId(null);
    setTaskId(null);
  };

  const handleProjectChange = (id: number | null) => {
    console.log("[TimerSelectionCard] handleProjectChange", {
      prevProjectId: projectId,
      nextProjectId: id,
    });

    if (id == null) {
      setProjectId(null);
      setMilestoneId(null);
      setTaskId(null);
      return;
    }

    const eff = projectEffectiveLineage(id, projMaps.byId);
    const nextGoalId = eff.goalId ?? goalId ?? null;

    setGoalId(nextGoalId);
    setProjectId(id);
    setMilestoneId(null);
    setTaskId(null);
  };

  const handleMilestoneChange = (id: number | null) => {
    console.log("[TimerSelectionCard] handleMilestoneChange", {
      prevMilestoneId: milestoneId,
      nextMilestoneId: id,
    });

    if (id == null) {
      setMilestoneId(null);
      setTaskId(null);
      return;
    }

    const eff = milestoneEffectiveLineage(id, msMaps.byId, projMaps.byId);

    const nextProjectId = eff.projectId ?? projectId ?? null;
    const nextGoalId = eff.goalId ?? goalId ?? null;

    setGoalId(nextGoalId);
    setProjectId(nextProjectId);
    setMilestoneId(id);
    setTaskId(null);
  };

  const handleTaskChange = (id: number | null) => {
    console.log("[TimerSelectionCard] handleTaskChange", {
      prevTaskId: taskId,
      nextTaskId: id,
    });

    if (id == null) {
      setTaskId(null);
      return;
    }

    const t = tasksById.get(id);
    if (!t) {
      setTaskId(id);
      return;
    }

    const tMsId = t.milestoneId ?? null;
    const tPrId = t.projectId ?? null;
    const tGoId = t.goalId ?? null;

    // prefer-const fix: this is never reassigned below
    const nextMilestoneId = tMsId ?? milestoneId ?? null;

    let nextProjectId = tPrId ?? projectId ?? null;
    let nextGoalId = tGoId ?? goalId ?? null;

    if (nextMilestoneId != null) {
      const eff = milestoneEffectiveLineage(
        nextMilestoneId,
        msMaps.byId,
        projMaps.byId,
      );
      if (nextProjectId == null && eff.projectId != null) {
        nextProjectId = eff.projectId;
      }
      if (nextGoalId == null && eff.goalId != null) {
        nextGoalId = eff.goalId;
      }
    } else if (nextProjectId != null) {
      const eff = projectEffectiveLineage(nextProjectId, projMaps.byId);
      if (nextGoalId == null && eff.goalId != null) {
        nextGoalId = eff.goalId;
      }
    }

    setGoalId(nextGoalId);
    setProjectId(nextProjectId);
    setMilestoneId(nextMilestoneId);
    setTaskId(id);
  };

  // ─────────────────────────────────────────────
  // Sanitise selection when underlying entities disappear
  // ─────────────────────────────────────────────

  useEffect(() => {
    if (!isActiveSession) return;

    if (
      effectiveModeId != null &&
      effectiveModeId !== -1 &&
      !modes.some((m) => m.id === effectiveModeId)
    ) {
      setModeId(selectedModeId ?? -1);
      setGoalId(null);
      setProjectId(null);
      setMilestoneId(null);
      setTaskId(null);
      return;
    }

    if (goalId != null && !goals.some((g) => g.id === goalId)) {
      setGoalId(null);
      setProjectId(null);
      setMilestoneId(null);
      setTaskId(null);
      return;
    }

    if (projectId != null && !projMaps.byId.has(projectId)) {
      setProjectId(null);
      setMilestoneId(null);
      setTaskId(null);
      return;
    }

    if (milestoneId != null && !msMaps.byId.has(milestoneId)) {
      setMilestoneId(null);
      setTaskId(null);
      return;
    }

    if (taskId != null && !tasksById.has(taskId)) {
      setTaskId(null);
    }
  }, [
    isActiveSession,
    effectiveModeId,
    modes,
    goals,
    projMaps.byId,
    msMaps.byId,
    tasksById,
    selectedModeId,
    goalId,
    projectId,
    milestoneId,
    taskId,
    setModeId,
    setGoalId,
    setProjectId,
    setMilestoneId,
    setTaskId,
  ]);

  const completeLabel =
    completeLabelTitle && completeLabelTitle.trim().length > 0
      ? `Complete “${completeLabelTitle.trim()}”`
      : "Complete";

  return (
    <div
      className="rounded-2xl border-2 p-4 md:p-6 space-y-4 md:space-y-6 pb-4 md:pb-6"
      style={{ borderColor: modeColor }}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <h3 className="text-base md:text-lg font-semibold">
          What are you timing?
        </h3>

        {showSwitch && (
          <button
            type="button"
            onClick={onSwitchToSelection}
            className="w-full sm:w-auto px-3 md:px-4 py-1.5 rounded-md text-xs md:text-sm font-medium shadow-sm transition"
            style={{
              backgroundColor: modeColor,
              color: getContrastingText(modeColor),
            }}
          >
            Switch to Selection
          </button>
        )}
      </div>

      <TimerEntityInputs
        modes={modes}
        goals={goalsSorted}
        projects={projectsWithSelected}
        milestones={milestonesWithSelected}
        tasks={tasksWithSelected}
        modeId={effectiveModeId}
        goalId={goalId}
        projectId={projectId}
        milestoneId={milestoneId}
        taskId={taskId}
        onModeChange={handleModeChange}
        onGoalChange={handleGoalChange}
        onProjectChange={handleProjectChange}
        onMilestoneChange={handleMilestoneChange}
        onTaskChange={handleTaskChange}
        modeColor={modeColor}
      />

      {isActiveSession && (
        <div className="pt-3 border-t flex justify-end">
          <button
            type="button"
            onClick={onComplete}
            disabled={isCompleting}
            className={[
              "inline-flex items-center justify-center gap-2",
              "w-full md:w-auto",
              "px-4 md:px-5 py-2 md:py-2.5",
              "text-xs md:text-sm font-semibold",
              "rounded-lg",
              "shadow-sm",
              "transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            ].join(" ")}
            style={{
              backgroundColor: "#14532D",
              color: "#FFFFFF",
            }}
            onMouseEnter={(e) => {
              if (!isCompleting)
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  "#052E16";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "#14532D";
            }}
          >
            <span className="truncate max-w-[280px] md:max-w-[520px]">
              {isCompleting ? "Completing…" : completeLabel}
            </span>
            <Check className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
          </button>
        </div>
      )}
    </div>
  );
}
