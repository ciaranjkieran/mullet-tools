"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios"; // ✅ your configured client
import { SelectedIds } from "../types/types";
import { useTaskStore } from "../../../store/useTaskStore";
import { useMilestoneStore } from "../../../store/useMilestoneStore";
import { useProjectStore } from "../../../store/useProjectStore";
import { useGoalStore } from "../../../store/useGoalStore";
import { useBatchBackend } from "../useBatchBackend";
import { runInBatches } from "../runInBatches";
import { ensureCsrf } from "../../hooks/auth/ensureCsrf";

// fan-out hooks when backend is off
import { useUpdateTask } from "../../../api/hooks/tasks/useUpdateTask";
import { useUpdateMilestone } from "../../../api/hooks/milestones/useUpdateMilestone";
import { useUpdateProject } from "../../../api/hooks/projects/useUpdateProject";
import { useUpdateGoal } from "../../../api/hooks/goals/useUpdateGoal";

type Payload = {
  selected: SelectedIds;
  dueDate: string | null;
  dueTime: string | null;
  skipInvalidate?: boolean;
};

export function useBatchSchedule() {
  const qc = useQueryClient();
  const useBackend = useBatchBackend();

  const updateTask = useUpdateTask();
  const updateMilestone = useUpdateMilestone();
  const updateProject = useUpdateProject();
  const updateGoal = useUpdateGoal();

  return useMutation({
    mutationFn: async (body: Payload) => {
      const { skipInvalidate: _skip, ...clean } = body;

      if (useBackend) {
        await ensureCsrf();
        return api.post("/batch/schedule/", clean);
      }

      const { selected, dueDate, dueTime } = clean;
      const { task = [], milestone = [], project = [], goal = [] } = selected;

      await Promise.all([
        task.length
          ? runInBatches(
              task,
              (id) => updateTask.mutateAsync({ id, dueDate, dueTime }),
              8
            )
          : Promise.resolve(),
        milestone.length
          ? runInBatches(
              milestone,
              (id) => updateMilestone.mutateAsync({ id, dueDate, dueTime }),
              8
            )
          : Promise.resolve(),
        project.length
          ? runInBatches(
              project,
              (id) => updateProject.mutateAsync({ id, dueDate, dueTime }),
              8
            )
          : Promise.resolve(),
        goal.length
          ? runInBatches(
              goal,
              (id) => updateGoal.mutateAsync({ id, dueDate, dueTime } as any),
              8
            )
          : Promise.resolve(),
      ]);

      return { data: { ok: true } };
    },

    onMutate: async (body) => {
      // pause queries so optimistic updates render immediately
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

      const patch = (o: any) => ({
        ...o,
        dueDate: body.dueDate,
        dueTime: body.dueTime,
      });

      const patchByIdMap = (
        map: Record<number, any> | undefined,
        ids: Set<number>
      ) => {
        if (!map) return map;
        const next = { ...map };
        ids.forEach((id) => {
          if (next[id]) next[id] = patch(next[id]);
        });
        return next;
      };

      const tSet = new Set(body.selected.task);
      const mSet = new Set(body.selected.milestone);
      const pSet = new Set(body.selected.project);
      const gSet = new Set(body.selected.goal);

      useTaskStore.setState((s: any) => ({
        tasks: s.tasks.map((t: any) => (tSet.has(t.id) ? patch(t) : t)),
        byId: patchByIdMap(s.byId, tSet),
      }));
      useMilestoneStore.setState((s: any) => ({
        milestones: s.milestones.map((m: any) =>
          mSet.has(m.id) ? patch(m) : m
        ),
        byId: patchByIdMap(s.byId, mSet),
      }));
      useProjectStore.setState((s: any) => ({
        projects: s.projects.map((p: any) => (pSet.has(p.id) ? patch(p) : p)),
        byId: patchByIdMap(s.byId, pSet),
      }));
      useGoalStore.setState((s: any) => ({
        goals: s.goals.map((g: any) => (gSet.has(g.id) ? patch(g) : g)),
        byId: patchByIdMap(s.byId, gSet),
      }));

      return { prev };
    },

    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      // rollback arrays
      useTaskStore.setState({ tasks: ctx.prev.tasks });
      useMilestoneStore.setState({ milestones: ctx.prev.milestones });
      useProjectStore.setState({ projects: ctx.prev.projects });
      useGoalStore.setState({ goals: ctx.prev.goals });
      // rollback maps (if present)
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
      if (vars?.skipInvalidate) return; // orchestrator will do one final invalidate
      await qc.invalidateQueries({ queryKey: ["tasks"] });
      await qc.invalidateQueries({ queryKey: ["milestones"] });
      await qc.invalidateQueries({ queryKey: ["projects"] });
      await qc.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}
