import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { TimeEntryDTO } from "../../../types/Timer";
import { ACTIVE_TIMER_QK } from "./useActiveTimer";
import { TIME_ENTRIES_QK } from "./useTimeEntries";
import { ensureCsrf } from "../auth/ensureCsrf";

export function useStopTimer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await ensureCsrf();
      const { data } = await api.post("/timer/stop");
      return data as TimeEntryDTO;
    },

    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ACTIVE_TIMER_QK });
      const prev = qc.getQueryData(ACTIVE_TIMER_QK);
      qc.setQueryData(ACTIVE_TIMER_QK, null);
      return { prev };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(ACTIVE_TIMER_QK, ctx.prev);
    },

    onSuccess: (entry) => {
      qc.setQueryData<TimeEntryDTO[] | undefined>(TIME_ENTRIES_QK(), (prev) => {
        const list = prev ?? [];
        const withoutDup = list.filter((e) => e.id !== entry.id);
        const ts = (e: TimeEntryDTO) =>
          e.endedAt ? Date.parse(e.endedAt) : Date.parse(e.startedAt);
        return [entry, ...withoutDup].sort((a, b) => ts(b) - ts(a));
      });
    },

    onSettled: async () => {
      qc.invalidateQueries({
        queryKey: ACTIVE_TIMER_QK,
        refetchType: "active",
      });
      qc.invalidateQueries({
        queryKey: ["timer", "entries"],
        refetchType: "active",
      });
    },
  });
}
