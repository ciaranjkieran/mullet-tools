import { useMutation } from "@tanstack/react-query";
import axios from "axios";

type MilestonePositionUpdate = {
  id: number;
  position: number;
};

export const useUpdateMilestonePositions = () => {
  return useMutation({
    mutationFn: async (updates: MilestonePositionUpdate[]) => {
      await axios.patch(
        "http://127.0.0.1:8000/api/milestones/bulk-update-positions/",
        updates
      );
    },
  });
};
