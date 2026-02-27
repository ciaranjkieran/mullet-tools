"use client";

import { Comment } from "@shared/types/Comment";
import { Task } from "@shared/types/Task";
import { Milestone } from "@shared/types/Milestone";
import { Project } from "@shared/types/Project";
import { Goal } from "@shared/types/Goal";
import { format } from "date-fns";
import clsx from "clsx";
import { TargetIcon } from "lucide-react";
import AssigneeAvatar from "../common/AssigneeAvatar";
import { useModeMembers } from "@shared/api/hooks/collaboration/useModeMembers";

import {
  openTaskDialogFromComments,
  openMilestoneDialogFromComments,
  openProjectDialogFromComments,
  openGoalDialogFromComments,
} from "@/lib/dialogs/openEntityDialogs";

type Props = {
  entity: Task | Milestone | Project | Goal;
  entityType: "task" | "milestone" | "project" | "goal";
  comments: Comment[];
  breadcrumb: string;
  title: string;
  modeColor: string;
};

export default function CommentPreviewCard({
  entity,
  entityType,
  comments,
  breadcrumb,
  modeColor,
  title,
}: Props) {
  const firstComment = comments[0];
  const { data: membersData } = useModeMembers(firstComment?.mode);
  const isCollaborative = (membersData?.members?.length ?? 0) > 1;

  const handleClick = () => {
    switch (entityType) {
      case "task":
        openTaskDialogFromComments(entity as Task);
        break;
      case "milestone":
        openMilestoneDialogFromComments(entity as Milestone);
        break;
      case "project":
        openProjectDialogFromComments(entity as Project);
        break;
      case "goal":
        openGoalDialogFromComments(entity as Goal);
        break;
    }
  };

  const renderIcon = () => {
    switch (entityType) {
      case "goal":
        return (
          <div
            className="flex items-center justify-center rounded-full w-5 h-5 relative top-[0.5px] left-[0.5px]"
            style={{ backgroundColor: modeColor }}
          >
            <TargetIcon className="w-4 h-4 text-white" />
          </div>
        );
      case "milestone":
        return (
          <span
            className="triangle"
            style={{
              borderTopColor: modeColor,
              borderTopWidth: 10,
              borderLeftWidth: 6,
              borderRightWidth: 6,
              transform: "rotate(0deg)",
            }}
          />
        );
      case "project":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill={modeColor}
            className="w-5 h-5"
          >
            <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h5.379a1.5 1.5 0 0 1 1.06.44l1.621 1.62H19.5A1.5 1.5 0 0 1 21 6.56V18a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 18V4.5Z" />
          </svg>
        );
      case "task":
        return (
          <span
            className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
            style={{ backgroundColor: modeColor }}
          />
        );
    }
  };

  return (
    <div
      onClick={handleClick}
      className={clsx(
        "cursor-pointer border rounded-md p-4 transition-colors",
        "hover:shadow-sm"
      )}
      style={{
        borderColor: "#e5e7eb",
        transition: "border-color 0.2s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = modeColor;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "#e5e7eb";
      }}
    >
      <p className="text-sm text-gray-800 mb-1 line-clamp-3">
        {firstComment.body || "[No comment body]"}
      </p>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        {isCollaborative && firstComment.author && (
          <div className="flex items-center gap-1">
            <AssigneeAvatar assignee={firstComment.author} size={18} />
            <span className="font-medium text-gray-700">{firstComment.author.displayName || firstComment.author.username}</span>
          </div>
        )}
        <span>{format(new Date(firstComment.created_at), "PPP p")}</span>
      </div>
      {comments.length > 1 && (
        <p className="text-xs font-semibold text-gray-800 italic mt-1 mb-2">
          {comments.length - 1} more comment{comments.length - 1 > 1 ? "s" : ""}
        </p>
      )}

      <div className="flex items-center gap-2 text-sm text-gray-700 leading-tight mt-2">
        {renderIcon()}
        <div className="truncate flex items-baseline min-w-0">
          <span className="font-medium truncate">{title}</span>
          {breadcrumb && (
            <>
              <span className="mx-1 text-gray-400 shrink-0">|</span>
              <span className="text-gray-500 truncate">{breadcrumb}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
