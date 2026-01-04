import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

export const useDeleteNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteId: number) => {
      await ensureCsrf();
      await api.delete(`/notes/${noteId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) && q.queryKey[0] === "notes",
      });
    },
  });
};
