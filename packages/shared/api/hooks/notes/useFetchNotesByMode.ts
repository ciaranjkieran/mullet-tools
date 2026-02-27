import { useQuery } from "@tanstack/react-query";
import api from "../../axios"; // use your configured instance
import { Note } from "../../../types/Note";

export const useFetchNotesByMode = (modeId: number) =>
  useQuery<Note[]>({
    queryKey: ["notes", "mode", modeId],
    queryFn: async () => {
      const res = await api.get("/notes/", {
        params: { mode_id: modeId },
      });

      // Convert snake_case to camelCase manually for now
      return res.data.map((note: any) => ({
        id: note.id,
        modeId: note.mode,
        body: note.body,
        created_at: note.created_at,
        updated_at: note.updated_at,
        content_type: note.content_type,
        object_id: note.object_id,
        entityTitle: note.entity_title,
        display_title: note.display_title,
        author: note.author ?? null,
      }));
    },
    enabled: !!modeId,
  });
