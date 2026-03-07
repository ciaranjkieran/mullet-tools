import React, { useMemo, useCallback } from "react";
import { View } from "react-native";
import EntityIcon from "../EntityIcon";
import type { Mode } from "@shared/types/Mode";
import type { Goal } from "@shared/types/Goal";
import type { Project } from "@shared/types/Project";
import type { Milestone } from "@shared/types/Milestone";
import type { Task } from "@shared/types/Task";
import {
  filterEditorOptions,
  type EditorSelection,
  type EditorDatasets,
} from "@shared/lineage/editorFilter";
import {
  makeProjectMaps,
  makeMilestoneMaps,
  projectEffectiveLineage,
  milestoneEffectiveLineage,
} from "@shared/lineage/effective";
import DropdownPicker from "../dashboard/DropdownPicker";

type TaskWithLinks = Task & {
  goalId?: number | null;
  projectId?: number | null;
  milestoneId?: number | null;
};

function projectIsDescendantOrSelf(
  candidateId: number,
  ancestorId: number,
  byId: Map<number, Project>
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
  byId: Map<number, Milestone>
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

type Props = {
  modes: Mode[];
  goals: Goal[];
  projects: Project[];
  milestones: Milestone[];
  tasks: Task[];
  modeId: number | null;
  goalId: number | null;
  projectId: number | null;
  milestoneId: number | null;
  taskId: number | null;
  setModeId: (id: number | null) => void;
  setGoalId: (id: number | null) => void;
  setProjectId: (id: number | null) => void;
  setMilestoneId: (id: number | null) => void;
  setTaskId: (id: number | null) => void;
  disabled: boolean;
};

export default function EntityPicker({
  modes,
  goals,
  projects,
  milestones,
  tasks,
  modeId,
  goalId,
  projectId,
  milestoneId,
  taskId,
  setModeId,
  setGoalId,
  setProjectId,
  setMilestoneId,
  setTaskId,
  disabled,
}: Props) {
  const modeColor =
    modes.find((m) => m.id === modeId)?.color ?? "#6b7280";

  const effectiveModeId = modeId ?? 0;

  // Build editor selection & datasets for shared filtering logic
  const sel = useMemo<EditorSelection>(
    () => ({
      modeId: effectiveModeId,
      goalId: goalId ?? null,
      projectId: projectId ?? null,
      milestoneId: milestoneId ?? null,
    }),
    [effectiveModeId, goalId, projectId, milestoneId]
  );

  const datasets = useMemo<EditorDatasets>(
    () => ({ modes, goals, projects, milestones }),
    [modes, goals, projects, milestones]
  );

  // Lineage maps for parent-chain walks
  const projMaps = useMemo(() => makeProjectMaps(projects), [projects]);
  const msMaps = useMemo(() => makeMilestoneMaps(milestones), [milestones]);

  // Hierarchical filtering via shared editorFilter
  const filtered = useMemo(
    () => filterEditorOptions(sel, datasets),
    [sel, datasets]
  );

  // Treat tasks as TaskWithLinks for lineage-aware filtering
  const tasksWithLinks = useMemo(() => tasks as TaskWithLinks[], [tasks]);

  // Task filtering: lineage-aware, matching web behavior
  const filteredTasks = useMemo(() => {
    if (!effectiveModeId) return [];
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
        const tidPr = t.projectId ?? null;
        const tidMs = t.milestoneId ?? null;
        if (tidPr != null && projectIsDescendantOrSelf(tidPr, projectId, projMaps.byId)) {
          return true;
        }
        if (tidMs != null) {
          const effMs = milestoneEffectiveLineage(tidMs, msMaps.byId, projMaps.byId);
          const effProjId = effMs.projectId ?? null;
          if (effProjId != null && projectIsDescendantOrSelf(effProjId, projectId, projMaps.byId)) {
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
          const effMs = milestoneEffectiveLineage(tidMs, msMaps.byId, projMaps.byId);
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
  }, [tasksWithLinks, effectiveModeId, goalId, projectId, milestoneId, projMaps.byId, msMaps.byId]);

  // Ensure selected entities remain visible in dropdown lists
  const goalsWithSelected = useMemo(() => {
    if (goalId == null) return filtered.goals;
    if (filtered.goals.some((g) => g.id === goalId)) return filtered.goals;
    const selected = goals.find((g) => g.id === goalId);
    return selected ? [...filtered.goals, selected] : filtered.goals;
  }, [filtered.goals, goalId, goals]);

  const projectsWithSelected = useMemo(() => {
    if (projectId == null) return filtered.projects;
    if (filtered.projects.some((p) => p.id === projectId)) return filtered.projects;
    const selected = projects.find((p) => p.id === projectId);
    return selected ? [...filtered.projects, selected] : filtered.projects;
  }, [filtered.projects, projectId, projects]);

  const milestonesWithSelected = useMemo(() => {
    if (milestoneId == null) return filtered.milestones;
    if (filtered.milestones.some((m) => m.id === milestoneId)) return filtered.milestones;
    const selected = milestones.find((m) => m.id === milestoneId);
    return selected ? [...filtered.milestones, selected] : filtered.milestones;
  }, [filtered.milestones, milestoneId, milestones]);

  const tasksWithSelected = useMemo(() => {
    if (taskId == null) return filteredTasks;
    if (filteredTasks.some((t) => t.id === taskId)) return filteredTasks;
    const selected = tasksWithLinks.find((t) => t.id === taskId);
    return selected ? [...filteredTasks, selected] : filteredTasks;
  }, [filteredTasks, taskId, tasksWithLinks]);

  // Handlers using explicit lineage resolution (matching web behavior)
  const handleModeChange = useCallback(
    (id: number | null) => {
      setModeId(id);
      setGoalId(null);
      setProjectId(null);
      setMilestoneId(null);
      setTaskId(null);
    },
    [setModeId, setGoalId, setProjectId, setMilestoneId, setTaskId]
  );

  const handleGoalChange = useCallback(
    (id: number | null) => {
      setGoalId(id);
      setProjectId(null);
      setMilestoneId(null);
      setTaskId(null);
    },
    [setGoalId, setProjectId, setMilestoneId, setTaskId]
  );

  const handleProjectChange = useCallback(
    (id: number | null) => {
      if (id == null) {
        setProjectId(null);
        setMilestoneId(null);
        setTaskId(null);
        return;
      }
      const eff = projectEffectiveLineage(id, projMaps.byId);
      setGoalId(eff.goalId ?? goalId ?? null);
      setProjectId(id);
      setMilestoneId(null);
      setTaskId(null);
    },
    [projMaps.byId, goalId, setGoalId, setProjectId, setMilestoneId, setTaskId]
  );

  const handleMilestoneChange = useCallback(
    (id: number | null) => {
      if (id == null) {
        setMilestoneId(null);
        setTaskId(null);
        return;
      }
      const eff = milestoneEffectiveLineage(id, msMaps.byId, projMaps.byId);
      setGoalId(eff.goalId ?? goalId ?? null);
      setProjectId(eff.projectId ?? projectId ?? null);
      setMilestoneId(id);
      setTaskId(null);
    },
    [msMaps.byId, projMaps.byId, goalId, projectId, setGoalId, setProjectId, setMilestoneId, setTaskId]
  );

  const handleTaskChange = useCallback(
    (id: number | null) => {
      if (id == null) {
        setTaskId(null);
        return;
      }
      const t = tasksWithLinks.find((t) => t.id === id);
      if (!t) {
        setTaskId(id);
        return;
      }
      const tMsId = t.milestoneId ?? null;
      const tPrId = t.projectId ?? null;
      const tGoId = t.goalId ?? null;

      const nextMilestoneId = tMsId ?? milestoneId ?? null;
      let nextProjectId = tPrId ?? projectId ?? null;
      let nextGoalId = tGoId ?? goalId ?? null;

      if (nextMilestoneId != null) {
        const eff = milestoneEffectiveLineage(nextMilestoneId, msMaps.byId, projMaps.byId);
        if (nextProjectId == null && eff.projectId != null) nextProjectId = eff.projectId;
        if (nextGoalId == null && eff.goalId != null) nextGoalId = eff.goalId;
      } else if (nextProjectId != null) {
        const eff = projectEffectiveLineage(nextProjectId, projMaps.byId);
        if (nextGoalId == null && eff.goalId != null) nextGoalId = eff.goalId;
      }

      setGoalId(nextGoalId);
      setProjectId(nextProjectId);
      setMilestoneId(nextMilestoneId);
      setTaskId(id);
    },
    [tasksWithLinks, msMaps.byId, projMaps.byId, goalId, projectId, milestoneId, setGoalId, setProjectId, setMilestoneId, setTaskId]
  );

  return (
    <View style={{ marginBottom: 8 }}>
      <DropdownPicker
        label="Mode"
        icon="layers"
        options={modes}
        selectedId={modeId}
        onChange={handleModeChange}
        modeColor={modeColor}
      />

      {modeId && (
        <>
          <DropdownPicker
            label="Goal"
            iconElement={<EntityIcon type="goal" color={modeColor} size={14} />}
            options={goalsWithSelected}
            selectedId={goalId}
            onChange={handleGoalChange}
            modeColor={modeColor}
          />

          <DropdownPicker
            label="Project"
            iconElement={<EntityIcon type="project" color={modeColor} size={14} />}
            options={projectsWithSelected}
            selectedId={projectId}
            onChange={handleProjectChange}
            modeColor={modeColor}
          />

          <DropdownPicker
            label="Milestone"
            iconElement={<EntityIcon type="milestone" color={modeColor} size={14} />}
            options={milestonesWithSelected}
            selectedId={milestoneId}
            onChange={handleMilestoneChange}
            modeColor={modeColor}
          />

          <DropdownPicker
            label="Task"
            iconElement={<EntityIcon type="task" color={modeColor} size={14} />}
            options={tasksWithSelected}
            selectedId={taskId}
            onChange={handleTaskChange}
            modeColor={modeColor}
          />
        </>
      )}
    </View>
  );
}
