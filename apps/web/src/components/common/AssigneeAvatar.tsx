"use client";

import type { Assignee } from "@shared/types/Assignee";

type Props = {
  assignee?: Assignee | null;
  size?: number;
};

export default function AssigneeAvatar({ assignee, size = 20 }: Props) {
  if (!assignee) return null;

  const initial = (assignee.displayName || assignee.username || "?")[0].toUpperCase();

  // Avatar URL from API may be relative (/media/...) — prefix with backend origin
  const avatarSrc =
    assignee.avatar && !assignee.avatar.startsWith("http")
      ? `${(process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "")}${assignee.avatar}`
      : assignee.avatar;

  return (
    <div
      className="rounded-full bg-neutral-200 flex items-center justify-center overflow-hidden flex-shrink-0"
      style={{ width: size, height: size }}
      title={assignee.displayName || assignee.username}
    >
      {avatarSrc ? (
        <img
          src={avatarSrc}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : (
        <span
          className="font-medium text-neutral-600 leading-none"
          style={{ fontSize: size * 0.5 }}
        >
          {initial}
        </span>
      )}
    </div>
  );
}
