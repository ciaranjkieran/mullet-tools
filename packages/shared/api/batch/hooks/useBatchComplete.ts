"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios"; // ✅ use the configured axios (baseURL=/api)
import { SelectedIds } from "../types/types";
import { useTaskStore } from "../../../store/useTaskStore";
import { useMilestoneStore } from "../../../store/useMilestoneStore";
import { useProjectStore } from "../../../store/useProjectStore";
import { useGoalStore } from "../../../store/useGoalStore";
import { useBatchBackend } from "../useBatchBackend";
import { ensureCsrf } from "../../hooks/auth/ensureCsrf";

type Payload = {
  selected: SelectedIds;
  skipInvalidate?: boolean; // orchestrator can do one final invalidate
};

/**
 * TEMP: "Complete" behaves like "Delete".
 * Removes selected entities. Optimistic + rollback, hits /batch/delete/ when backend enabled.
 */
export function useBatchComplete() {
  const qc = useQueryClient();
  const useBackend = useBatchBackend();

  return useMutation({
    mutationFn: async (body: Payload) => {
      const { skipInvalidate: _skip, ...clean } = body;

      if (useBackend) {
        await ensureCsrf();
        return api.post("/batch/complete/", clean);
      }

      return { data: { ok: true } };
    },

    // 🔥 Optimistic removal from arrays + byId maps
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

    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      // rollback arrays
      useTaskStore.setState({ tasks: ctx.prev.tasks });
      useMilestoneStore.setState({ milestones: ctx.prev.milestones });
      useProjectStore.setState({ projects: ctx.prev.projects });
      useGoalStore.setState({ goals: ctx.prev.goals });
      // rollback maps
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
