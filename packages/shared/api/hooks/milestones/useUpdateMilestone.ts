import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  mapMilestoneFromApi,
  mapMilestoneToApi,
} from "../../mappers/milestoneMapper";
import { buildPatch } from "../../../utils/buildPatch";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

// Helper: normalize "at most one" on a partial update
function normalizeAncestorsForPatch(m: UpdateMilestonePayload) {
  const pParent = Object.prototype.hasOwnProperty.call(m, "parentId")
    ? m.parentId
    : undefined;
  const pProject = Object.prototype.hasOwnProperty.call(m, "projectId")
    ? m.projectId
    : undefined;
  const pGoal = Object.prototype.hasOwnProperty.call(m, "goalId")
    ? m.goalId
    : undefined;

  let parentId = pParent;
  let projectId = pProject;
  let goalId = pGoal;

  if (typeof parentId === "number") {
    projectId = pProject !== undefined ? null : projectId;
    goalId = pGoal !== undefined ? null : goalId;
  } else if (typeof projectId === "number") {
    parentId = pParent !== undefined ? null : parentId;
    goalId = pGoal !== undefined ? null : goalId;
  } else if (typeof goalId === "number") {
    parentId = pParent !== undefined ? null : parentId;
    projectId = pProject !== undefined ? null : projectId;
  }

  return {
    ...m,
    ...(pParent !== undefined ? { parentId } : {}),
    ...(pProject !== undefined ? { projectId } : {}),
    ...(pGoal !== undefined ? { goalId } : {}),
  };
}

type UpdateMilestonePayload = {
  id: number;
} & Partial<{
  title: string;
  modeId: number;
  dueDate: string | null;
  dueTime: string | null;
  parentId: number | null;
  projectId: number | null;
  goalId: number | null;
  isCompleted: boolean;
}>;

export function useUpdateMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (m: UpdateMilestonePayload) => {
      await ensureCsrf();

      const normalized = normalizeAncestorsForPatch(m);
      const body = buildPatch(mapMilestoneToApi(normalized));

      const res = await api.patch(`/milestones/${m.id}/`, body);
      return mapMilestoneFromApi(res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milestones"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] }); // keep your cascade
    },
  });
}
