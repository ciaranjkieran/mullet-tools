"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mapTaskFromApi } from "@shared/api/mappers/taskMapper";
import { createTask } from "./tasks";
import { useEffect } from "react";
import { useTaskStore } from "@shared/store/useTaskStore";
import { Task } from "../../../types/Task";
import api from "../../axios";

export const useTasks = () => {
  const setTasks = useTaskStore((s) => s.setTasks);
  const queryClient = useQueryClient();

  const query = useQuery<Task[], Error>({
    queryKey: ["tasks"],
    queryFn: async () => {
      const res = await api.get("/tasks/");
      return res.data.map(mapTaskFromApi);
    },
  });

  useEffect(() => {
    if (query.data) setTasks(query.data);
  }, [query.data, setTasks]);

  const mutation = useMutation({
    mutationFn: createTask, // ensure createTask uses `api` with credentials
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  return {
    ...query,
    createTask: mutation.mutate,
    creating: mutation.isPending,
  };
};
