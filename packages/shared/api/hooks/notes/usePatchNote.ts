import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";
import { Note } from "../../../types/Note";

interface PatchNoteInput {
  id: number;
  body?: string;
  mode?: number;
  content_type?: "task" | "milestone" | "project" | "goal" | "mode";
  object_id?: number;
  entity_title?: string;
}

export const usePatchNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: PatchNoteInput) => {
      await ensureCsrf();
      const res = await api.patch(`/notes/${id}/`, updates);
      return res.data as Note;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
};
