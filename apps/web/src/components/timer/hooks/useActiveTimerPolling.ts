// hooks/useActiveTimerPolling.ts
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ActiveTimerDTO } from "@shared/types/Timer";
import { ACTIVE_TIMER_QK } from "@shared/api/hooks/timer/useActiveTimer";

export function useActiveTimerPolling(
  active: ActiveTimerDTO | null | undefined
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (active?.kind === "timer") {
      const id = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ACTIVE_TIMER_QK });
      }, 1000);
      return () => clearInterval(id);
    }
  }, [active, queryClient]);
}
