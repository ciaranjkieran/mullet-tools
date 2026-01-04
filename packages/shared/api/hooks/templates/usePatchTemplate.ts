import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Template } from "../../../types/Template";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

export const usePatchTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: number;
      updates: Partial<Template>;
    }) => {
      await ensureCsrf();
      const res = await api.patch(`/templates/${id}/`, updates);
      return res.data as Template;
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["template", id] });
    },
  });
};
