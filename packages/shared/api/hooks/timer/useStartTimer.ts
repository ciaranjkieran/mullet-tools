import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ACTIVE_TIMER_QK } from "./useActiveTimer";
import { ActiveTimerDTO, StartTimerPayload } from "../../../types/Timer";
import { ensureCsrf } from "../auth/ensureCsrf";

// keep STATS_QK if you really use it elsewhere
export const STATS_QK = ["stats"];

export function useStartTimer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: StartTimerPayload): Promise<ActiveTimerDTO> => {
      await ensureCsrf();

      let body: any = payload;
      if ("path" in payload && payload.path) {
        const { modeId, goalId, projectId, milestoneId, taskId } = payload.path;
        body = {
          kind: payload.kind,
          durationSec: payload.durationSec,
          modeId,
          goalId,
          projectId,
          milestoneId,
          taskId,
        };
      }

      const { data } = await api.post("/timer/start", body);
      return data as ActiveTimerDTO;
    },

    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ACTIVE_TIMER_QK });
      const prev = qc.getQueryData<ActiveTimerDTO | null>(ACTIVE_TIMER_QK);

      let optimistic: ActiveTimerDTO | null = prev ?? null;

      const isResume = "resumeFromEntryId" in (vars as any);
      const hasPath = "path" in (vars as any) && !!(vars as any).path;

      if (!isResume && hasPath) {
        const nowISO = new Date().toISOString();
        const endsAtISO =
          (vars as any).kind === "timer" && (vars as any).durationSec
            ? new Date(
                Date.now() + (vars as any).durationSec * 1000
              ).toISOString()
            : null;

        optimistic = {
          kind: (vars as any).kind,
          startedAt: nowISO,
          endsAt: endsAtISO,
          path: (vars as any).path,
          sessionId: null,
          plannedSeconds:
            (vars as any).kind === "timer"
              ? (vars as any).durationSec ?? null
              : null,
        };
      }

      qc.setQueryData(ACTIVE_TIMER_QK, optimistic);
      return { prev };
    },

    onError: (_err, _vars, ctx) => {
      qc.setQueryData(ACTIVE_TIMER_QK, ctx?.prev ?? null);
    },

    onSuccess: (data) => {
      qc.setQueryData(ACTIVE_TIMER_QK, data);

      // ✅ This matches your real time entries keys (all ranges)
      qc.invalidateQueries({ queryKey: ["timer", "entries"] });
      qc.invalidateQueries({ queryKey: STATS_QK });
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ACTIVE_TIMER_QK });
    },
  });
}
