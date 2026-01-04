import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";

export function useDeleteTask() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: number) => {
      // ensure csrf header is set (same pattern as logout/login)
      const csrf = await api.get<{ csrftoken: string }>("/auth/csrf/");
      api.defaults.headers.common["X-CSRFToken"] = csrf.data.csrftoken;

      await api.delete(`/tasks/${taskId}/`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}
