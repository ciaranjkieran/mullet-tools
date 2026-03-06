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
  reconcileAfterChange,
  type EditorSelection,
  type EditorDatasets,
} from "@shared/lineage/editorFilter";
import DropdownPicker from "../dashboard/DropdownPicker";

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

  // Pre-filter entities by mode for the datasets
  const modeGoals = useMemo(
    () => (modeId ? goals.filter((g) => g.modeId === modeId) : []),
    [goals, modeId]
  );
  const modeProjects = useMemo(
    () => (modeId ? projects.filter((p) => p.modeId === modeId) : []),
    [projects, modeId]
  );
  const modeMilestones = useMemo(
    () => (modeId ? milestones.filter((m) => m.modeId === modeId) : []),
    [milestones, modeId]
  );
  const modeTasks = useMemo(
    () => (modeId ? tasks.filter((t) => t.modeId === modeId) : []),
    [tasks, modeId]
  );

  // Build editor selection & datasets for shared filtering logic
  const sel = useMemo<EditorSelection>(
    () => ({
      modeId: modeId ?? 0,
      goalId: goalId ?? null,
      projectId: projectId ?? null,
      milestoneId: milestoneId ?? null,
    }),
    [modeId, goalId, projectId, milestoneId]
  );

  const datasets = useMemo<EditorDatasets>(
    () => ({
      modes,
      goals: modeGoals,
      projects: modeProjects,
      milestones: modeMilestones,
    }),
    [modes, modeGoals, modeProjects, modeMilestones]
  );

  // Hierarchical filtering via shared editorFilter
  const filtered = useMemo(
    () => filterEditorOptions(sel, datasets),
    [sel, datasets]
  );

  // Task filtering: by most specific selected parent
  const filteredTasks = useMemo(() => {
    if (milestoneId) return modeTasks.filter((t) => t.milestoneId === milestoneId);
    if (projectId) return modeTasks.filter((t) => t.projectId === projectId);
    if (goalId) return modeTasks.filter((t) => t.goalId === goalId);
    return modeTasks;
  }, [modeTasks, milestoneId, projectId, goalId]);

  // Reconcile helper: apply a change and propagate to parent setters
  const applyChange = useCallback(
    (patch: Partial<EditorSelection>) => {
      const next = reconcileAfterChange(sel, patch, datasets);
      setGoalId(next.goalId ?? null);
      setProjectId(next.projectId ?? null);
      setMilestoneId(next.milestoneId ?? null);
      setTaskId(null);
    },
    [sel, datasets, setGoalId, setProjectId, setMilestoneId, setTaskId]
  );

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
      applyChange({ goalId: id, projectId: null, milestoneId: null });
    },
    [applyChange]
  );

  const handleProjectChange = useCallback(
    (id: number | null) => {
      applyChange({ projectId: id, milestoneId: null });
    },
    [applyChange]
  );

  const handleMilestoneChange = useCallback(
    (id: number | null) => {
      applyChange({ milestoneId: id });
    },
    [applyChange]
  );

  const handleTaskChange = useCallback(
    (id: number | null) => {
      setTaskId(id);
    },
    [setTaskId]
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
            options={filtered.goals}
            selectedId={goalId}
            onChange={handleGoalChange}
            modeColor={modeColor}
          />

          <DropdownPicker
            label="Project"
            iconElement={<EntityIcon type="project" color={modeColor} size={14} />}
            options={filtered.projects}
            selectedId={projectId}
            onChange={handleProjectChange}
            modeColor={modeColor}
          />

          <DropdownPicker
            label="Milestone"
            iconElement={<EntityIcon type="milestone" color={modeColor} size={14} />}
            options={filtered.milestones}
            selectedId={milestoneId}
            onChange={handleMilestoneChange}
            modeColor={modeColor}
          />

          <DropdownPicker
            label="Task"
            iconElement={<EntityIcon type="task" color={modeColor} size={14} />}
            options={filteredTasks}
            selectedId={taskId}
            onChange={handleTaskChange}
            modeColor={modeColor}
          />
        </>
      )}
    </View>
  );
}
