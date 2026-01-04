import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  mapProjectFromApi,
  mapProjectToApi,
} from "../../mappers/projectMapper";
import { buildPatch } from "../../../utils/buildPatch";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

type UpdateProjectPayload = {
  id: number;
} & Partial<{
  title: string;
  description: string | null;
  parentId: number | null; // tri-state on PATCH
  goalId: number | null; // tri-state on PATCH
  modeId: number;
  dueDate: string | null;
  dueTime: string | null;
  isCompleted: boolean;
}>;

function normalizeProjectAncestorsForPatch(p: UpdateProjectPayload) {
  const hasParent = Object.prototype.hasOwnProperty.call(p, "parentId");
  const hasGoal = Object.prototype.hasOwnProperty.call(p, "goalId");

  let parentId = hasParent ? p.parentId : undefined;
  let goalId = hasGoal ? p.goalId : undefined;

  if (typeof parentId === "number") {
    if (hasGoal) goalId = null;
  } else if (typeof goalId === "number") {
    if (hasParent) parentId = null;
  }

  return {
    ...p,
    ...(hasParent ? { parentId } : {}),
    ...(hasGoal ? { goalId } : {}),
  };
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (project: UpdateProjectPayload) => {
      await ensureCsrf();

      const normalized = normalizeProjectAncestorsForPatch(project);
      const body = buildPatch(mapProjectToApi(normalized));

      const res = await api.patch(`/projects/${project.id}/`, body);
      return mapProjectFromApi(res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["milestones"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
