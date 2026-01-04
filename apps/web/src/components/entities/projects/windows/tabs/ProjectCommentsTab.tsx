"use client";

import { useCommentsByEntity } from "@shared/api/hooks/comments/useCommentsByEntity";
import CommentCard from "@/components/comments/CommentCard";
import CommentComposer from "@/components/comments/CommentComposer";
import Spinner from "@/components/status/Spinner";

import { Project } from "@shared/types/Project";

type Props = {
  project: Project;
  modeColor: string;
};

export default function ProjectCommentsTab({ project, modeColor }: Props) {
  const { data: generalComments = [], isLoading } = useCommentsByEntity(
    "project",
    project.id
  );

  return (
    <div
      className="flex-1 flex flex-col overflow-y-auto scrollbar-thin mb-6"
      style={{ ["--scrollbar-color" as any]: modeColor }}
    >
      <div className="flex flex-col h-full p-6 mt-4 space-y-6">
        {/* 1. Flat Comments on Project */}
        <div className="space-y-4 pr-2">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Comments</h2>

          {isLoading ? (
            <Spinner />
          ) : generalComments.length > 0 ? (
            generalComments.map((comment) => (
              <CommentCard key={comment.id} comment={comment} />
            ))
          ) : (
            <p className="text-sm text-gray-500 italic">No comments yet.</p>
          )}
        </div>

        {/* 2. Composer */}
        <CommentComposer
          modeId={project.modeId}
          entity="project"
          entityId={project.id}
          modeColor={modeColor}
          autoFocus
        />
      </div>
    </div>
  );
}
