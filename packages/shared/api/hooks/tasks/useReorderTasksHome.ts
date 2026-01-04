import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { useTaskStore } from "../../../store/useTaskStore";
import { ensureCsrf } from "../auth/ensureCsrf";

type ReorderPayload = {
  modeId: number;
  container: {
    kind: "milestone" | "project" | "goal" | "mode";
    id: number;
  };
  changes: { id: number; position: number }[];
};

export function useReorderTasksHome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: ReorderPayload) => {
      await ensureCsrf();
      return api.patch("/tasks/reorder-home/", {
        mode_id: body.modeId,
        container: body.container,
        changes: body.changes,
      });
    },

    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const snapshot = useTaskStore.getState().tasks;

      useTaskStore.getState().updateTaskPositionsLocally(body.changes);

      return { previousTasks: snapshot };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousTasks) {
        useTaskStore.setState({ tasks: context.previousTasks });
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
