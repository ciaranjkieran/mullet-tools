import { useMutation } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

type ProjectPositionUpdate = {
  id: number;
  position: number;
};

export const useUpdateProjectPositions = () => {
  return useMutation({
    mutationFn: async (updates: ProjectPositionUpdate[]) => {
      await ensureCsrf();
      await api.patch("/projects/bulk-update-positions/", updates);
    },
  });
};
