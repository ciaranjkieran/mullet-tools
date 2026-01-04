"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios"; // ✅ your configured axios instance
import { SelectedIds } from "../types/types";
import { useBatchBackend } from "../useBatchBackend";
import { runInBatches } from "../runInBatches";

// Stores
import { useTaskStore } from "../../../store/useTaskStore";
import { useMilestoneStore } from "../../../store/useMilestoneStore";
import { useProjectStore } from "../../../store/useProjectStore";
import { useGoalStore } from "../../../store/useGoalStore";

// Optional per-entity delete hooks (fan-out path)
import { useDeleteTask } from "../../../api/hooks/tasks/useDeleteTask";
import { useDeleteMilestone } from "../../../api/hooks/milestones/useDeleteMilestone";
import { useDeleteProject } from "../../../api/hooks/projects/useDeleteProject";
import { useDeleteGoal } from "../../../api/hooks/goals/useDeleteGoal";

type Payload = { selected: SelectedIds; skipInvalidate?: boolean };

export function useBatchDelete() {
  const qc = useQueryClient();
  const useBackend = useBatchBackend();

  // These may or may not exist in your codebase—guard accordingly.
  const deleteTask = useDeleteTask?.();
  const deleteMilestone = useDeleteMilestone?.();
  const deleteProject = useDeleteProject?.();
  const deleteGoal = useDeleteGoal?.();

  const haveFanout =
    Boolean(deleteTask) &&
    Boolean(deleteMilestone) &&
    Boolean(deleteProject) &&
    Boolean(deleteGoal);

  return useMutation({
    // Server batch OR client fan-out
    mutationFn: async (body: Payload) => {
      const { skipInvalidate: _skip, ...clean } = body;

      if (useBackend) {
        // baseURL handles /api prefix -> POST /api/batch/delete/
        return api.post("/batch/delete/", clean);
      }

      // If you have per-entity delete hooks, fire them (optimistic removal still happens in onMutate)
      if (haveFanout) {
        const {
          task = [],
          milestone = [],
          project = [],
          goal = [],
        } = clean.selected;

        await Promise.all([
          task.length
            ? runInBatches(task, (id) => deleteTask!.mutateAsync(id), 8)
            : Promise.resolve(),
          milestone.length
            ? runInBatches(
                milestone,
                (id) => deleteMilestone!.mutateAsync(id),
                8
              )
            : Promise.resolve(),
          project.length
            ? runInBatches(project, (id) => deleteProject!.mutateAsync(id), 8)
            : Promise.resolve(),
          goal.length
            ? runInBatches(goal, (id) => deleteGoal!.mutateAsync(id), 8)
            : Promise.resolve(),
        ]);
      }

      // If no backend and no fan-out hooks, we still did optimistic removal in onMutate.
      return { data: { ok: true } };
    },

    // ✅ Optimistic removal from arrays AND byId maps
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

      // Helper: remove keys from a byId map
      const omitFromMap = (
        map: Record<number, any> | undefined,
        ids: Set<number>
      ) => {
        if (!map) return map;
        const next = { ...map };
        ids.forEach((id) => {
          if (id in next) delete next[id];
        });
        return next;
      };

      useTaskStore.setState((s: any) => ({
        tasks: s.tasks.filter((t: any) => !tSet.has(t.id)),
        byId: omitFromMap(s.byId, tSet),
      }));

      useMilestoneStore.setState((s: any) => ({
        milestones: s.milestones.filter((m: any) => !mSet.has(m.id)),
        byId: omitFromMap(s.byId, mSet),
      }));

      useProjectStore.setState((s: any) => ({
        projects: s.projects.filter((p: any) => !pSet.has(p.id)),
        byId: omitFromMap(s.byId, pSet),
      }));

      useGoalStore.setState((s: any) => ({
        goals: s.goals.filter((g: any) => !gSet.has(g.id)),
        byId: omitFromMap(s.byId, gSet),
      }));

      return { prev };
    },

    // Rollback both arrays and maps
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

    // Single invalidate (unless orchestrator will do it)
    onSettled: async (_data, _error, vars) => {
      if (vars?.skipInvalidate) return;
      await qc.invalidateQueries({ queryKey: ["tasks"] });
      await qc.invalidateQueries({ queryKey: ["milestones"] });
      await qc.invalidateQueries({ queryKey: ["projects"] });
      await qc.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}
