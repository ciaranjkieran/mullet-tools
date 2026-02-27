// components/comments/CommentCard.tsx
"use client";

import { useState } from "react";
import { Comment } from "@shared/types/Comment";
import { format } from "date-fns";
import { useDeleteComment } from "@shared/api/hooks/comments/useDeleteComment";
import { Trash2 } from "lucide-react";
import Linkify from "linkify-react";
import CommentAttachment from "./CommentAttachment";
import ConfirmDialog from "../../lib/utils/ConfirmDialog";
import AssigneeAvatar from "../common/AssigneeAvatar";
import { useModeMembers } from "@shared/api/hooks/collaboration/useModeMembers";

type Props = { comment: Comment };

export default function CommentCard({ comment }: Props) {
  const { mutate: deleteComment, isPending } = useDeleteComment();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { data: membersData } = useModeMembers(comment.mode);
  const isCollaborative = (membersData?.members?.length ?? 0) > 1;

  const handleConfirmDelete = () => {
    deleteComment(comment.id);
  };

  const hasAttachments = comment.attachments.length > 0;

  return (
    <div className="bg-gray-100 rounded-lg p-3 text-sm text-gray-900 relative group mb-2">
      <div className="whitespace-pre-wrap break-words">
        <Linkify
          options={{
            target: "_blank",
            rel: "noopener noreferrer",
            className: "text-blue-600 underline break-all",
          }}
        >
          {comment.body}
        </Linkify>
      </div>

      {hasAttachments && (
        <div className="mt-3 space-y-2">
          {comment.attachments.map((att) => (
            <CommentAttachment
              key={att.id}
              url={att.url}
              name={att.original_name}
              mime={att.mime}
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
        {isCollaborative && comment.author && (
          <div className="flex items-center gap-1">
            <AssigneeAvatar assignee={comment.author} size={18} />
            <span className="font-medium text-gray-700">{comment.author.displayName || comment.author.username}</span>
          </div>
        )}
        <span>{format(new Date(comment.created_at), "PPP p")}</span>
      </div>

      <div
        onClick={() => setConfirmOpen(true)}
        className="absolute top-2 right-2 p-1 rounded-md hover:bg-gray-200 text-gray-500 group-hover:visible invisible cursor-pointer"
        title="Delete comment"
      >
        <Trash2 className="w-4 h-4" />
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete this comment?"
        description="This action cannot be undone. The comment will be permanently deleted."
        confirmText={isPending ? "Deleting..." : "Delete"}
        cancelText="Cancel"
      />
    </div>
  );
}
