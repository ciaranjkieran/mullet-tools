import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mapTaskFromApi, mapTaskToApi } from "@shared/api/mappers/taskMapper";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

type CreateTaskPayload = {
  title: string;
  modeId: number;
  dueDate?: string | null;
  dueTime?: string | null;
  milestoneId?: number | null;
  projectId?: number | null;
  goalId?: number | null;
  assignedToId?: number | null;
};

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: CreateTaskPayload) => {
      await ensureCsrf();

      const body = {
        isCompleted: false,
        ...mapTaskToApi(task),
      };

      const res = await api.post("/tasks/", body);
      return mapTaskFromApi(res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
