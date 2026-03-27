"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@shared/api/axios";
import { ensureCsrf } from "@shared/api/hooks/auth/ensureCsrf";
import type { TimeEntryDTO } from "@shared/types/Timer";
import { TIME_ENTRIES_QK } from "@shared/api/hooks/timer/useTimeEntries";

type EntityType = "task" | "milestone" | "project" | "goal";

type Payload = {
  entityType: EntityType;
  entityId: number;
};

type Resp = {
  stoppedEntry: TimeEntryDTO | null;
  completed: { entityType: EntityType; entityId: number };
  next: null | {
    entityType: EntityType;
    entityId: number;
    path: {
      modeId: number | null;
      goalId: number | null;
      projectId: number | null;
      milestoneId: number | null;
      taskId: number | null;
    };
  };
  dropdownEmpty: boolean;
};

export function useCompleteNextTimer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: Payload) => {
      await ensureCsrf();
      const { data } = await api.post<Resp>("/timer/complete-next", body);
      return data;
    },
    onSuccess: async (data) => {
      // Optimistically reflect stop so UI unblocks immediately
      qc.setQueryData(["activeTimer"], null);
      qc.setQueryData(["timer", "active"], null);

      // Optimistically insert stopped entry into today's entries
      if (data.stoppedEntry) {
        const entry = data.stoppedEntry;
        qc.setQueryData<TimeEntryDTO[] | undefined>(TIME_ENTRIES_QK(), (prev) => {
          const list = prev ?? [];
          const withoutDup = list.filter((e) => e.id !== entry.id);
          const ts = (e: TimeEntryDTO) =>
            e.endedAt ? Date.parse(e.endedAt) : Date.parse(e.startedAt);
          return [entry, ...withoutDup].sort((a, b) => ts(b) - ts(a));
        });
      }

      // Refetch all in parallel (not sequentially)
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["timer"] }),
        qc.invalidateQueries({ queryKey: ["activeTimer"], exact: false }),
        qc.invalidateQueries({ queryKey: ["tasks"], exact: false }),
        qc.invalidateQueries({ queryKey: ["milestones"], exact: false }),
        qc.invalidateQueries({ queryKey: ["projects"], exact: false }),
        qc.invalidateQueries({ queryKey: ["goals"], exact: false }),
      ]);
    },
  });
}
