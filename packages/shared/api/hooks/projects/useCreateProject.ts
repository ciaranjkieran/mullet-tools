import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useProjectStore } from "../../../../shared/store/useProjectStore";
import { Project } from "../../../types/Project";
import {
  mapProjectFromApi,
  mapProjectToApi,
} from "../../mappers/projectMapper";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

interface CreateProjectInput {
  title: string;
  description?: string;
  parentId?: number | null;
  modeId?: number | null;
  goalId?: number | null;
  dueDate?: string | null;
  dueTime?: string | null;
  assignedToId?: number | null;
}

async function createProject(input: CreateProjectInput): Promise<Project> {
  await ensureCsrf();

  const body = {
    isCompleted: false,
    ...mapProjectToApi({
      title: input.title,
      description: input.description,
      parentId: input.parentId,
      modeId: input.modeId ?? undefined,
      goalId: input.goalId ?? undefined,
      dueDate: input.dueDate ?? undefined,
      dueTime: input.dueTime ?? undefined,
    }),
  };

  const res = await api.post("/projects/", body);
  return mapProjectFromApi(res.data);
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const addProject = useProjectStore((s) => s.addProject);

  return useMutation({
    mutationFn: createProject,
    onSuccess: (project) => {
      addProject(project);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
