// apps/web/src/shared/api/hooks/auth/useLogout.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";
import { resetAllStores } from "../../../store/resetAllStores";
import { ACTIVE_TIMER_QK } from "../timer/useActiveTimer"; // adjust path if needed

export function useLogout() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await ensureCsrf();

      // 1) Try stop timer if we *think* one is running
      const active = qc.getQueryData(ACTIVE_TIMER_QK);
      if (active) {
        try {
          await api.post("/timer/stop");
        } catch {
          // ignore — logout must still succeed
        }
      }

      // 2) Logout
      await api.post("/auth/logout/");
    },

    onSuccess: async () => {
      qc.clear();
      resetAllStores();
    },
  });
}
