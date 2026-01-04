import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";
import { Comment } from "../../../types/Comment";

interface NewCommentInput {
  entity: "task" | "milestone" | "project" | "goal" | "mode";
  entityId: number;
  modeId: number;
  body: string;
  files?: File[];
}

async function postComment(input: NewCommentInput): Promise<Comment> {
  await ensureCsrf();

  const formData = new FormData();
  formData.append("entity", input.entity);
  formData.append("entity_id", String(input.entityId));
  formData.append("mode", String(input.modeId));
  formData.append("body", input.body);

  input.files?.forEach((file) => formData.append("attachments", file));

  const res = await api.post("/comments/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data as Comment;
}

export function usePostComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postComment,
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) && q.queryKey[0] === "comments",
      });
    },
  });
}
