import { useQuery } from "@tanstack/react-query";
import api from "../../axios";
import { Note } from "../../../types/Note";

export const useFetchNotesByEntity = (entityType: string, entityId: number) =>
  useQuery<Note[]>({
    queryKey: ["notes", "entity", entityType, entityId],
    queryFn: async () => {
      const res = await api.get("/notes/", {
        params: { entity_type: entityType, entity_id: entityId },
      });
      return res.data as Note[];
    },
    enabled: !!entityType && !!entityId,
  });
