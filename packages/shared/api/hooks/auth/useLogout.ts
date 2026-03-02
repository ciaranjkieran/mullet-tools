import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";
import { handleTokenCleared } from "./tokenCallbacks";
import { ACTIVE_TIMER_QK } from "../timer/useActiveTimer";

// Injectable callback for store resets (web injects resetAllStores, mobile its own)
let _onLogoutCleanup: (() => void) | null = null;
export function setOnLogoutCleanup(cb: () => void) {
  _onLogoutCleanup = cb;
}

export function useLogout() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await ensureCsrf();

      // Try stop timer if one is running
      const active = qc.getQueryData(ACTIVE_TIMER_QK);
      if (active) {
        try {
          await api.post("/timer/stop");
        } catch {
          // ignore — logout must still succeed
        }
      }

      await api.post("/auth/logout/");
    },

    onSuccess: async () => {
      // Cancel all in-flight queries BEFORE clearing to prevent
      // a storm of 401 refetches from still-mounted hooks
      await qc.cancelQueries();
      qc.clear();
      await handleTokenCleared();
      _onLogoutCleanup?.();
    },
  });
}
