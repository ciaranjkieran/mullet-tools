import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mapTaskToApi } from "@shared/api/mappers/taskMapper";
import { buildPatch } from "../../../utils/buildPatch";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

type UpdateTaskPayload = {
  id: number;
} & Partial<{
  title: string;
  modeId: number;
  dueDate: string | null;
  dueTime: string | null;
  milestoneId: number | null;
  projectId: number | null;
  goalId: number | null;
  isCompleted: boolean;
  position: number | undefined;
  assignedToId: number | null;
}>;

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: UpdateTaskPayload) => {
      await ensureCsrf();

      const forMapper = {
        ...task,
        position: (task as any).position === null ? undefined : task.position,
      };

      const body = buildPatch(mapTaskToApi(forMapper as any));
      const res = await api.patch(`/tasks/${task.id}/`, body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
