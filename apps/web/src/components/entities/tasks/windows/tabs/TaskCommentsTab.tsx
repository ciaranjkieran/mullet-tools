"use client";

import { useCommentsByEntity } from "@shared/api/hooks/comments/useCommentsByEntity";
import { Task } from "@shared/types/Task";
import Spinner from "@/components/status/Spinner";
import CommentCard from "@/components/comments/CommentCard";
import CommentComposer from "@/components/comments/CommentComposer";

type Props = {
  task: Task;
  modeColor: string;
};

export default function TaskCommentsTab({ task, modeColor }: Props) {
  const { data = [], isLoading } = useCommentsByEntity("task", task.id);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {isLoading ? (
          <Spinner />
        ) : data.length > 0 ? (
          data.map((comment) => (
            <CommentCard key={comment.id} comment={comment} />
          ))
        ) : (
          <p className="text-sm text-gray-500 italic">No comments yet.</p>
        )}
      </div>

      <div className="border-t p-4">
        <CommentComposer
          modeId={task.modeId}
          entity="task"
          entityId={task.id}
          modeColor={modeColor}
          autoFocus
        />
      </div>
    </div>
  );
}
