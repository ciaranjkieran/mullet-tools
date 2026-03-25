import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";
import { useTaskStore } from "../../../store/useTaskStore";

export function useDeleteTask() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: number) => {
      // Optimistically remove from store immediately
      useTaskStore.getState().deleteTask(taskId);
      await ensureCsrf();
      await api.delete(`/tasks/${taskId}/`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
    onError: () => {
      // Refetch on failure to restore state
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
