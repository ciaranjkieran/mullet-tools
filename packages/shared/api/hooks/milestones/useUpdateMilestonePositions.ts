import { useMutation } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

type MilestonePositionUpdate = {
  id: number;
  position: number;
};

export const useUpdateMilestonePositions = () => {
  return useMutation({
    mutationFn: async (updates: MilestonePositionUpdate[]) => {
      await ensureCsrf();
      await api.patch("/milestones/bulk-update-positions/", updates);
    },
  });
};
