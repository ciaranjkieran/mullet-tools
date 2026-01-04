import { useMutation } from "@tanstack/react-query";
import { useProjectStore } from "../../../../shared/store/useProjectStore";
import { Project } from "../../../types/Project";
import { mapProjectFromApi } from "../../../../shared/api/mappers/projectMapper";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

export function useBulkMoveProjects() {
  return useMutation({
    mutationFn: async ({
      projectIds,
      dueDate,
      modeId,
    }: {
      projectIds: number[];
      dueDate?: string | null;
      modeId?: number | null;
    }) => {
      await ensureCsrf();

      const res = await api.patch("/projects/bulk/", {
        projectIds,
        dueDate,
        modeId,
      });
      return res.data.map(mapProjectFromApi);
    },

    onSuccess: (updatedProjects: Project[]) => {
      const current = useProjectStore.getState().projects;
      const setProjects = useProjectStore.getState().setProjects;

      const merged = current.map((project) => {
        const update = updatedProjects.find((p) => p.id === project.id);
        return update ? { ...project, ...update } : project;
      });

      setProjects(merged);
    },
  });
}
