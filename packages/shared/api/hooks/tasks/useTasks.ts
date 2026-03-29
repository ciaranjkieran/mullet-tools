"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mapTaskFromApi } from "@shared/api/mappers/taskMapper";
import { createTask } from "./tasks";
import { Task } from "../../../types/Task";
import api from "../../axios";

export const useTasks = () => {
  const queryClient = useQueryClient();

  const query = useQuery<Task[], Error>({
    queryKey: ["tasks"],
    queryFn: async () => {
      const res = await api.get("/tasks/");
      return res.data.map(mapTaskFromApi);
    },
  });

  const mutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  return {
    ...query,
    createTask: mutation.mutate,
    creating: mutation.isPending,
  };
};
