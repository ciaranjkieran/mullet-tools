"use client";
import React from "react";
import { Milestone } from "@shared/types/Milestone";

type Props = {
  milestones: Milestone[];
  milestoneId: number | null;
  onChange?: (id: number | null) => void;
  locked?: boolean;
  error?: string;
  isMixed?: boolean;
  modeColor?: string; // ⬅️ NEW
  label?: string; // optional if you ever want "Parent Milestone"
};

export default function EditorMilestoneSelect({
  milestones,
  milestoneId,
  onChange,
  locked,
  error,
  isMixed,
  modeColor = "#333",
  label = "Milestone",
}: Props) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1 flex items-center gap-2">
        <span
          style={{
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderTop: `10px solid ${modeColor}`,
            display: "inline-block",
            width: 0,
            height: 0,
          }}
        />
        {label}
      </label>
      <select
        disabled={locked}
        value={milestoneId ?? ""}
        onChange={(e) =>
          onChange?.(e.target.value ? Number(e.target.value) : null)
        }
        className={`w-full border rounded-md px-2 py-1.5 text-sm ${
          locked ? "opacity-60 cursor-not-allowed" : ""
        }`}
      >
        {isMixed && <option value="">— Mixed —</option>}
        <option value="">None</option>
        {milestones.map((m) => (
          <option key={m.id} value={m.id}>
            {m.title}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
