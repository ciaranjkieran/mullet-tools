"use client";

import React from "react";
import { useModeMembers } from "@shared/api/hooks/collaboration/useModeMembers";
import { UserCircle } from "lucide-react";

type Props = {
  modeId: number | null;
  assignedToId: number | null;
  onChange: (id: number | null) => void;
};

export default function EditorAssigneeSelect({
  modeId,
  assignedToId,
  onChange,
}: Props) {
  const { data } = useModeMembers(modeId);
  const members = data?.members ?? [];

  // Only show the select when there's more than 1 member (solo mode has no use)
  if (members.length <= 1) return null;

  return (
    <div>
      <label className="block text-sm font-medium mb-1 flex items-center gap-2">
        <UserCircle className="w-3.5 h-3.5 text-gray-500" />
        Assignee
      </label>
      <select
        value={assignedToId ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? null : Number(v));
        }}
        className="w-full border rounded-md px-2 py-1.5 text-sm"
      >
        <option value="">Unassigned</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.displayName}
            {m.role === "owner" ? " (owner)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
