import { useMutation } from "@tanstack/react-query";
import { useTaskStore } from "@shared/store/useTaskStore";
import { Task } from "../../../types/Task";
import { mapTaskFromApi } from "@shared/api/mappers/taskMapper";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

export function useBulkMoveTasks() {
  return useMutation({
    mutationFn: async ({
      taskIds,
      dueDate,
      modeId,
    }: {
      taskIds: number[];
      dueDate?: string | null;
      modeId?: number | null;
    }) => {
      await ensureCsrf();
      const res = await api.patch("/tasks/bulk/", { taskIds, dueDate, modeId });
      return res.data.map(mapTaskFromApi);
    },

    onSuccess: (updatedTasks: Task[]) => {
      const current = useTaskStore.getState().tasks;
      const setTasks = useTaskStore.getState().setTasks;

      const merged = current.map((task) => {
        const update = updatedTasks.find((t) => t.id === task.id);
        return update ? { ...task, ...update } : task;
      });

      setTasks(merged);
    },
  });
}
