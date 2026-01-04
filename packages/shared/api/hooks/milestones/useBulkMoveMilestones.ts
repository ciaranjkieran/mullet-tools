import { useMutation } from "@tanstack/react-query";
import { useMilestoneStore } from "@shared/store/useMilestoneStore";
import { Milestone } from "@shared/types/Milestone";
import { mapMilestoneFromApi } from "@shared/api/mappers/milestoneMapper";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

export function useBulkMoveMilestones() {
  return useMutation({
    mutationFn: async ({
      milestoneIds,
      dueDate,
      modeId,
    }: {
      milestoneIds: number[];
      dueDate?: string | null;
      modeId?: number | null;
    }) => {
      await ensureCsrf();
      const res = await api.patch("/milestones/bulk/", {
        milestoneIds,
        dueDate,
        modeId,
      });
      return res.data.map(mapMilestoneFromApi);
    },

    onSuccess: (updatedMilestones: Milestone[]) => {
      const current = useMilestoneStore.getState().milestones;
      const setMilestones = useMilestoneStore.getState().setMilestones;

      const merged = current.map((milestone) => {
        const update = updatedMilestones.find((m) => m.id === milestone.id);
        return update ? { ...milestone, ...update } : milestone;
      });

      setMilestones(merged);
    },
  });
}
