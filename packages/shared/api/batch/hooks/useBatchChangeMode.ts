"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios"; // ✅ configured axios (baseURL=/api)
import { SelectedIds } from "../types/types";
import { useBatchBackend } from "../useBatchBackend";
import { runInBatches } from "../runInBatches";

// Stores
import { useTaskStore } from "../../../store/useTaskStore";
import { useMilestoneStore } from "../../../store/useMilestoneStore";
import { useProjectStore } from "../../../store/useProjectStore";
import { useGoalStore } from "../../../store/useGoalStore";

// Fan-out hooks
import { useUpdateTask } from "../../../api/hooks/tasks/useUpdateTask";
import { useUpdateMilestone } from "../../../api/hooks/milestones/useUpdateMilestone";
import { useUpdateProject } from "../../../api/hooks/projects/useUpdateProject";
import { useUpdateGoal } from "../../../api/hooks/goals/useUpdateGoal";
import { ensureCsrf } from "../../hooks/auth/ensureCsrf";

type Payload = {
  selected: SelectedIds;
  modeId: number;
  skipInvalidate?: boolean;
};

export function useBatchChangeMode() {
  const qc = useQueryClient();
  const useBackend = useBatchBackend();

  const updateTask = useUpdateTask();
  const updateMilestone = useUpdateMilestone();
  const updateProject = useUpdateProject();
  const updateGoal = useUpdateGoal();

  return useMutation({
    // server batch or client fan-out
    mutationFn: async (body: Payload) => {
      const { skipInvalidate: _skip, ...clean } = body;

      if (useBackend) {
        await ensureCsrf();
        return api.post("/batch/change-mode/", clean);
      }

      const { selected, modeId } = clean;
      const { task = [], milestone = [], project = [], goal = [] } = selected;

      await Promise.all([
        task.length
          ? runInBatches(
              task,
              (id) => updateTask.mutateAsync({ id, modeId } as any),
              8
            )
          : Promise.resolve(),
        milestone.length
          ? runInBatches(
              milestone,
              (id) => updateMilestone.mutateAsync({ id, modeId }),
              8
            )
          : Promise.resolve(),
        project.length
          ? runInBatches(
              project,
              (id) => updateProject.mutateAsync({ id, modeId }),
              8
            )
          : Promise.resolve(),
        goal.length
          ? runInBatches(
              goal,
              (id) => updateGoal.mutateAsync({ id, modeId } as any),
              8
            )
          : Promise.resolve(),
      ]);

      return { data: { ok: true } };
    },

    // optimistic patch arrays + byId maps
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      await qc.cancelQueries({ queryKey: ["milestones"] });
      await qc.cancelQueries({ queryKey: ["projects"] });
      await qc.cancelQueries({ queryKey: ["goals"] });

      const prev = {
        tasks: useTaskStore.getState().tasks,
        tasksById: (useTaskStore.getState() as any).byId,
        milestones: useMilestoneStore.getState().milestones,
        milestonesById: (useMilestoneStore.getState() as any).byId,
        projects: useProjectStore.getState().projects,
        projectsById: (useProjectStore.getState() as any).byId,
        goals: useGoalStore.getState().goals,
        goalsById: (useGoalStore.getState() as any).byId,
      };

      const tSet = new Set(body.selected.task);
      const mSet = new Set(body.selected.milestone);
      const pSet = new Set(body.selected.project);
      const gSet = new Set(body.selected.goal);
      const modeId = body.modeId;

      const patchByIdMap = (
        map: Record<number, any> | undefined,
        ids: Set<number>,
        extra: Record<string, any> = {}
      ) => {
        if (!map) return map;
        const next = { ...map };
        ids.forEach((id) => {
          if (next[id]) next[id] = { ...next[id], modeId, ...extra };
        });
        return next;
      };

      useTaskStore.setState((s: any) => ({
        tasks: s.tasks.map((t: any) =>
          tSet.has(t.id)
            ? {
                ...t,
                modeId,
                goalId: null,
                projectId: null,
                milestoneId: null,
              }
            : t
        ),
        byId: patchByIdMap(s.byId, tSet, {
          goalId: null,
          projectId: null,
          milestoneId: null,
        }),
      }));

      useMilestoneStore.setState((s: any) => ({
        milestones: s.milestones.map((m: any) =>
          mSet.has(m.id)
            ? {
                ...m,
                modeId,
                goalId: null,
                projectId: null,
                parentId: null,
              }
            : m
        ),
        byId: patchByIdMap(s.byId, mSet, {
          goalId: null,
          projectId: null,
          parentId: null,
        }),
      }));

      useProjectStore.setState((s: any) => ({
        projects: s.projects.map((p: any) =>
          pSet.has(p.id)
            ? {
                ...p,
                modeId,
                goalId: null,
                parentId: null,
              }
            : p
        ),
        byId: patchByIdMap(s.byId, pSet, {
          goalId: null,
          parentId: null,
        }),
      }));

      useGoalStore.setState((s: any) => ({
        goals: s.goals.map((g: any) => (gSet.has(g.id) ? { ...g, modeId } : g)),
        byId: patchByIdMap(s.byId, gSet),
      }));

      return { prev };
    },

    // rollback arrays + maps
    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      useTaskStore.setState({ tasks: ctx.prev.tasks });
      useMilestoneStore.setState({ milestones: ctx.prev.milestones });
      useProjectStore.setState({ projects: ctx.prev.projects });
      useGoalStore.setState({ goals: ctx.prev.goals });

      if (ctx.prev.tasksById)
        (useTaskStore.setState as any)({ byId: ctx.prev.tasksById });
      if (ctx.prev.milestonesById)
        (useMilestoneStore.setState as any)({ byId: ctx.prev.milestonesById });
      if (ctx.prev.projectsById)
        (useProjectStore.setState as any)({ byId: ctx.prev.projectsById });
      if (ctx.prev.goalsById)
        (useGoalStore.setState as any)({ byId: ctx.prev.goalsById });
    },

    onSettled: async (_data, _error, vars) => {
      if (vars?.skipInvalidate) return;
      await qc.invalidateQueries({ queryKey: ["tasks"] });
      await qc.invalidateQueries({ queryKey: ["milestones"] });
      await qc.invalidateQueries({ queryKey: ["projects"] });
      await qc.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}
