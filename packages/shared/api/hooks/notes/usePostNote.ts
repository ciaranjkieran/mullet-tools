import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";
import { Note } from "../../../types/Note";

interface NoteInput {
  body: string;
  mode_id: number;
  content_type: "task" | "milestone" | "project" | "goal" | "mode";
  object_id: number;
  entity_title?: string;
}

export const usePostNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      body,
      mode_id,
      content_type,
      object_id,
      entity_title,
    }: NoteInput) => {
      await ensureCsrf();

      const res = await api.post("/notes/", {
        body,
        mode: mode_id,
        content_type,
        object_id,
        entity_title,
      });

      return res.data as Note;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
};
