import { useMutation } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

type TaskPositionUpdate = { id: number; position: number };

export const useUpdateTaskPositions = () => {
  return useMutation({
    mutationFn: async (updates: TaskPositionUpdate[]) => {
      await ensureCsrf();
      await api.patch("/tasks/bulk-update-positions/", updates);
    },
  });
};
