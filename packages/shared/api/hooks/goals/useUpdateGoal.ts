import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useGoalStore } from "../../../store/useGoalStore";
import { mapGoalFromApi, mapGoalToApi } from "../../mappers/goalMapper";
import { buildPatch } from "../../../utils/buildPatch";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

type UpdateGoalPayload = {
  id: number;
} & Partial<{
  title: string;
  description: string | null;
  modeId: number;
  dueDate: string | null;
  dueTime: string | null;
  isCompleted: boolean;
  assignedToId: number | null;
}>;

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  const updateGoal = useGoalStore((s) => s.updateGoal);

  return useMutation({
    mutationFn: async (payload: UpdateGoalPayload) => {
      await ensureCsrf();
      const body = buildPatch(mapGoalToApi(payload));
      const res = await api.patch(`/goals/${payload.id}/`, body);
      return mapGoalFromApi(res.data);
    },
    onSuccess: (goal) => {
      updateGoal(goal);

      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["milestones"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
