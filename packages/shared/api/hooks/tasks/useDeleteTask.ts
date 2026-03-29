import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";
import { useTaskStore } from "../../../store/useTaskStore";

export function useDeleteTask() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: number) => {
      await ensureCsrf();
      await api.delete(`/tasks/${taskId}/`);
    },
    onMutate: (taskId) => {
      const prev = useTaskStore.getState().tasks;
      useTaskStore.getState().deleteTask(taskId);
      return { prev };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (_err, _taskId, ctx) => {
      if (ctx?.prev) useTaskStore.setState({ tasks: ctx.prev });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
