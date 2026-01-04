// @shared/api/hooks/timer/useRetargetTimer.ts
import { useMutation } from "@tanstack/react-query";
import api from "@shared/api/axios"; // your fetch wrapper

export type RetargetPayload = {
  modeId?: number;
  goalId?: number;
  projectId?: number;
  milestoneId?: number;
  taskId?: number;
};

export function useRetargetTimer() {
  return useMutation({
    mutationFn: async (payload: RetargetPayload) => {
      // server should coerce missing -> null/undefined and validate ownership
      return api.patch("/timer/active", payload);
    },
  });
}
