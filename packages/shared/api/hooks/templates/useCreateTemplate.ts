import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";
import type { CreateTemplateInput, Template } from "@shared/types/Template";

export const useCreateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newTemplate: CreateTemplateInput) => {
      await ensureCsrf();
      const res = await api.post("/templates/", newTemplate);
      return res.data as Template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
};
