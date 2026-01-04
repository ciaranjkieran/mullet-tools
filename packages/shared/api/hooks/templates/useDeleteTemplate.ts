import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await ensureCsrf();
      await api.delete(`/templates/${id}/`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.removeQueries({ queryKey: ["template", id] });
    },
  });
};
