import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@shared/api/axios";
import { ACTIVE_TIMER_QK } from "@shared/api/hooks/timer/useActiveTimer";
import { TIME_ENTRIES_QK } from "@shared/api/hooks/timer/useTimeEntries";

export type RetargetPayload = {
  modeId?: number | null;
  goalId?: number | null;
  projectId?: number | null;
  milestoneId?: number | null;
  taskId?: number | null;
};

export function useRetargetActiveTimer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: RetargetPayload) => {
      const { data } = await api.patch("/timer/active", body);
      return data;
    },
    onSuccess: () => {
      // Refresh the active snapshot…
      qc.invalidateQueries({ queryKey: [ACTIVE_TIMER_QK] });
      // …and the “today” entries (the slice lands there)
      qc.invalidateQueries({ queryKey: TIME_ENTRIES_QK("today", "today") });
    },
  });
}
