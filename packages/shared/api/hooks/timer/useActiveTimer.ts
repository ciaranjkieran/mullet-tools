// @shared/api/hooks/timer/useActiveTimer.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ActiveTimerDTO } from "../../../types/Timer";

export const ACTIVE_TIMER_QK = ["timer", "active"];

export function useActiveTimer() {
  const qc = useQueryClient();
  return useQuery<ActiveTimerDTO | null>({
    queryKey: ACTIVE_TIMER_QK,
    queryFn: async () => {
      const res = await api.get("/timer/active", {
        validateStatus: () => true,
      });
      // 204 → no content
      if (res.status === 204) return null;
      return res.data as ActiveTimerDTO;
    },
    staleTime: 5_000,
    refetchOnWindowFocus: true,
  });
}
