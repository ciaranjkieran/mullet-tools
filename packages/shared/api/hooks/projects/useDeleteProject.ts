import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";
import { useProjectStore } from "../../../store/useProjectStore";

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: number) => {
      await ensureCsrf();
      await api.delete(`/projects/${projectId}/`);
    },
    onMutate: (projectId) => {
      const prev = useProjectStore.getState().projects;
      useProjectStore.getState().deleteProject(projectId);
      return { prev };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["milestones"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (_err, _projectId, ctx) => {
      if (ctx?.prev) useProjectStore.setState({ projects: ctx.prev });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
