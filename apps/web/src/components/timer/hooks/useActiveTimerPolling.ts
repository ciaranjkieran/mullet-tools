// hooks/useActiveTimerPolling.ts
import { useEffect } from "react";
import { ActiveTimerDTO } from "@shared/types/Timer";

export function useActiveTimerPolling(
  active: ActiveTimerDTO | null | undefined
) {
  useEffect(() => {
    if (active?.kind === "timer") {
      const id = setInterval(() => {
        // refetch logic goes here
      }, 1000);
      return () => clearInterval(id);
    }
  }, [active]);
}
