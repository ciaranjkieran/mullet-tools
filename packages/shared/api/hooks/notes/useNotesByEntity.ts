import { useQuery } from "@tanstack/react-query";
import api from "../../axios";
import { Note } from "../../../types/Note";

export const useNotesByEntity = (entityType: string, entityId: number) => {
  return useQuery<Note[]>({
    queryKey: ["notes", entityType, entityId],
    queryFn: async () => {
      const res = await api.get(
        `/notes/?content_type=${entityType}&object_id=${entityId}`
      );
      return res.data;
    },
  });
};
