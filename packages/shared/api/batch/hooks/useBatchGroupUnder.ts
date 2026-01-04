"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { SelectedIds, ParentType } from "../types/types";
import { useBatchBackend } from "../useBatchBackend";
import { runInBatches } from "../runInBatches";

import { useTaskStore } from "../../../store/useTaskStore";
import { useMilestoneStore } from "../../../store/useMilestoneStore";
import { useProjectStore } from "../../../store/useProjectStore";

import { useUpdateTask } from "../../../api/hooks/tasks/useUpdateTask";
import { useUpdateMilestone } from "../../../api/hooks/milestones/useUpdateMilestone";
import { useUpdateProject } from "../../../api/hooks/projects/useUpdateProject";
import { ensureCsrf } from "../../hooks/auth/ensureCsrf";

type Payload = {
  selected: SelectedIds;
  parentType: ParentType;
  parentId: number;
  skipInvalidate?: boolean;
};

function patchTaskForParent(parentType: ParentType, parentId: number) {
  if (parentType === "goal")
    return { goalId: parentId, projectId: null, milestoneId: null };
  if (parentType === "project")
    return { projectId: parentId, goalId: null, milestoneId: null };
  if (parentType === "milestone")
    return { milestoneId: parentId, goalId: null, projectId: null };
  return {};
}
function patchMilestoneForParent(parentType: ParentType, parentId: number) {
  if (parentType === "goal") return { goalId: parentId, projectId: null };
  if (parentType === "project") return { projectId: parentId };
  if (parentType === "milestone") return { parentId };
  return {};
}
function patchProjectForParent(parentType: ParentType, parentId: number) {
  if (parentType === "goal") return { goalId: parentId };
  if (parentType === "project") return { parentId };
  if (parentType === "milestone") return null;
  return {};
}

export function useBatchGroupUnder() {
  const qc = useQueryClient();
  const useBackend = useBatchBackend();

  const updateTask = useUpdateTask();
  const updateMilestone = useUpdateMilestone();
  const updateProject = useUpdateProject();

  return useMutation({
    mutationFn: async (body: Payload) => {
      const { skipInvalidate: _skip, ...clean } = body;

      if (useBackend) {
        await ensureCsrf();
        return api.post("/batch/group-under/", clean);
      }

      const { selected, parentType, parentId } = clean;
      const { task = [], milestone = [], project = [] } = selected;

      await Promise.all([
        task.length
          ? runInBatches(
              task,
              (id) =>
                updateTask.mutateAsync({
                  id,
                  ...patchTaskForParent(parentType, parentId),
                } as any),
              8
            )
          : Promise.resolve(),
        milestone.length
          ? runInBatches(
              milestone,
              (id) =>
                updateMilestone.mutateAsync({
                  id,
                  ...patchMilestoneForParent(parentType, parentId),
                }),
              8
            )
          : Promise.resolve(),
        project.length
          ? runInBatches(
              project,
              (id) => {
                const patch = patchProjectForParent(parentType, parentId);
                if (patch == null) return Promise.resolve();
                return updateProject.mutateAsync({ id, ...patch });
              },
              8
            )
          : Promise.resolve(),
      ]);

      return { data: { ok: true } };
    },

    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      await qc.cancelQueries({ queryKey: ["milestones"] });
      await qc.cancelQueries({ queryKey: ["projects"] });

      const prev = {
        tasks: useTaskStore.getState().tasks,
        tasksById: (useTaskStore.getState() as any).byId,
        milestones: useMilestoneStore.getState().milestones,
        milestonesById: (useMilestoneStore.getState() as any).byId,
        projects: useProjectStore.getState().projects,
        projectsById: (useProjectStore.getState() as any).byId,
      };

      const tSet = new Set(body.selected.task);
      const mSet = new Set(body.selected.milestone);
      const pSet = new Set(body.selected.project);
      const { parentType, parentId } = body;

      const patchByIdMap = (
        map: Record<number, any> | undefined,
        ids: Set<number>,
        mkPatch: (o: any) => any
      ) => {
        if (!map) return map;
        const next = { ...map };
        ids.forEach((id) => {
          if (next[id]) next[id] = mkPatch(next[id]);
        });
        return next;
      };

      useTaskStore.setState((s: any) => {
        const mkPatch = (o: any) => ({
          ...o,
          ...patchTaskForParent(parentType, parentId),
        });
        return {
          tasks: s.tasks.map((t: any) => (tSet.has(t.id) ? mkPatch(t) : t)),
          byId: patchByIdMap(s.byId, tSet, mkPatch),
        };
      });

      useMilestoneStore.setState((s: any) => {
        const mkPatch = (o: any) => ({
          ...o,
          ...patchMilestoneForParent(parentType, parentId),
        });
        return {
          milestones: s.milestones.map((m: any) =>
            mSet.has(m.id) ? mkPatch(m) : m
          ),
          byId: patchByIdMap(s.byId, mSet, mkPatch),
        };
      });

      useProjectStore.setState((s: any) => {
        const mkPatch = (o: any) => {
          const p = patchProjectForParent(parentType, parentId);
          return p == null ? o : { ...o, ...p };
        };
        return {
          projects: s.projects.map((p: any) =>
            pSet.has(p.id) ? mkPatch(p) : p
          ),
          byId: patchByIdMap(s.byId, pSet, mkPatch),
        };
      });

      return { prev };
    },

    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      useTaskStore.setState({ tasks: ctx.prev.tasks });
      useMilestoneStore.setState({ milestones: ctx.prev.milestones });
      useProjectStore.setState({ projects: ctx.prev.projects });
      if (ctx.prev.tasksById)
        (useTaskStore.setState as any)({ byId: ctx.prev.tasksById });
      if (ctx.prev.milestonesById)
        (useMilestoneStore.setState as any)({ byId: ctx.prev.milestonesById });
      if (ctx.prev.projectsById)
        (useProjectStore.setState as any)({ byId: ctx.prev.projectsById });
    },

    onSettled: async (_data, _error, vars) => {
      if (vars?.skipInvalidate) return;
      await qc.invalidateQueries({ queryKey: ["tasks"] });
      await qc.invalidateQueries({ queryKey: ["milestones"] });
      await qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
