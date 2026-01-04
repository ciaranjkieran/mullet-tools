// lib/api/hooks/comments/useCommentsByMode.ts
import { useQuery } from "@tanstack/react-query";
import api from "../../axios";
import { Comment } from "../../../types/Comment";

export const useCommentsByMode = (modeId: number) => {
  return useQuery<Comment[]>({
    queryKey: ["comments", "mode", modeId],
    queryFn: async () => {
      const res = await api.get(`/comments/?mode=${modeId}`);
      return res.data;
    },
  });
};
