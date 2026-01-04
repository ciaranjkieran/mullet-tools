import { useMutation } from "@tanstack/react-query";
import { useGoalStore } from "../../../store/useGoalStore";
import { Goal } from "../../../types/Goal";
import { mapGoalFromApi } from "../../mappers/goalMapper";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

export function useBulkMoveGoals() {
  return useMutation({
    mutationFn: async ({
      goalIds,
      dueDate,
      modeId,
    }: {
      goalIds: number[];
      dueDate?: string | null;
      modeId?: number | null;
    }) => {
      await ensureCsrf();
      const res = await api.patch("/goals/bulk/", { goalIds, dueDate, modeId });
      return res.data.map(mapGoalFromApi);
    },

    onSuccess: (updatedGoals: Goal[]) => {
      const current = useGoalStore.getState().goals;
      const setGoals = useGoalStore.getState().setGoals;

      const merged = current.map((goal) => {
        const update = updatedGoals.find((g) => g.id === goal.id);
        return update ? { ...goal, ...update } : goal;
      });

      setGoals(merged);
    },
  });
}
