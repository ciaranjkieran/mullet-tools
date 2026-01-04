import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { useTaskStore } from "../../../store/useTaskStore";
import { ensureCsrf } from "../auth/ensureCsrf";

type Payload = {
  modeId: number;
  dateStr: string; // "YYYY-MM-DD"
  changes: { id: number; position: number }[];
};

export function useReorderTasksToday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: Payload) => {
      await ensureCsrf();
      return api.patch("/tasks/reorder-today/", {
        mode_id: body.modeId,
        date: body.dateStr,
        changes: body.changes,
      });
    },

    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const snapshot = useTaskStore.getState().tasks;

      useTaskStore.getState().updateTaskPositionsLocally(body.changes);

      return { previousTasks: snapshot };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previousTasks) {
        useTaskStore.setState({ tasks: ctx.previousTasks });
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
