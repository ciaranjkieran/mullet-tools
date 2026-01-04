import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";
import { Comment } from "../../../types/Comment";

type PatchCommentPayload = {
  id: number;
  body: string;
};

export const usePatchComment = () => {
  const queryClient = useQueryClient();

  return useMutation<Comment, Error, PatchCommentPayload>({
    mutationFn: async ({ id, body }) => {
      await ensureCsrf();
      const res = await api.patch(`/comments/${id}/`, { body });
      return res.data as Comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) && q.queryKey[0] === "comments",
      });
    },
  });
};
