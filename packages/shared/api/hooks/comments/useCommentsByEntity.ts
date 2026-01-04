// lib/api/hooks/comments/useCommentsByEntity.ts
import { useQuery } from "@tanstack/react-query";
import api from "../../axios";
import { Comment } from "../../../types/Comment";

export const useCommentsByEntity = (entityType: string, entityId: number) => {
  return useQuery<Comment[]>({
    queryKey: ["comments", entityType, entityId],
    queryFn: async () => {
      const res = await api.get(
        `/comments/?entity=${entityType}&entity_id=${entityId}`
      );
      return res.data;
    },
  });
};
