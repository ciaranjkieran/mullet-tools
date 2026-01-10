"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@shared/api/axios";
import { ensureCsrf } from "@shared/api/hooks/auth/ensureCsrf";
import type { TimeEntryDTO } from "@shared/types/Timer";

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
    onSuccess: async (_data) => {
      // ✅ Optimistically reflect stop (most complete-next flows stop the session)
      qc.setQueryData(["activeTimer"], null);
      qc.setQueryData(["timer", "active"], null);

      // then refetch
      await qc.invalidateQueries({ queryKey: ["timer"] });
      await qc.invalidateQueries({ queryKey: ["activeTimer"] });
      await qc.invalidateQueries({ queryKey: ["time-entries"] });
      await qc.invalidateQueries({ queryKey: ["timeEntries"] });

      await qc.invalidateQueries({ queryKey: ["activeTimer"], exact: false });
      await qc.invalidateQueries({ queryKey: ["tasks"], exact: false });
      await qc.invalidateQueries({ queryKey: ["milestones"], exact: false });
      await qc.invalidateQueries({ queryKey: ["projects"], exact: false });
      await qc.invalidateQueries({ queryKey: ["goals"], exact: false });
    },
  });
}
