import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useGoalStore } from "@shared/store/useGoalStore";
import { mapGoalFromApi, mapGoalToApi } from "../../mappers/goalMapper";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

interface CreateGoalInput {
  title: string;
  description?: string;
  dueDate?: string | null;
  dueTime?: string | null;
  modeId?: number | null;
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  const addGoal = useGoalStore((s) => s.addGoal);

  return useMutation({
    mutationFn: async (payload: CreateGoalInput) => {
      await ensureCsrf();

      const body = {
        isCompleted: false,
        ...mapGoalToApi({
          title: payload.title,
          description: payload.description,
          dueDate: payload.dueDate ?? undefined,
          dueTime: payload.dueTime ?? undefined,
          modeId: payload.modeId ?? undefined,
        }),
      };

      const res = await api.post("/goals/", body);
      return mapGoalFromApi(res.data);
    },
    onSuccess: (goal) => {
      addGoal(goal);
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}
