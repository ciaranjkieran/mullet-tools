"use client";

import React from "react";
import { Milestone } from "@shared/types/Milestone";

type Props = {
  milestones: Milestone[];
  milestoneId: number | null;
  onChange?: (id: number | null) => void;
  modeColor?: string;
  label?: string;
  disabled?: boolean;
};

export default function TimerMilestoneSelect({
  milestones,
  milestoneId,
  onChange,
  modeColor = "#333",
  label = "Milestone",
  disabled = false,
}: Props) {
  if (milestones.length === 0) return null;

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
        disabled={disabled}
        value={milestoneId ?? ""}
        onChange={(e) =>
          onChange?.(e.target.value ? Number(e.target.value) : null)
        }
        className={`w-full border rounded-md px-2 py-1.5 text-sm ${
          disabled ? "opacity-60 cursor-not-allowed" : ""
        }`}
      >
        <option value="">None</option>
        {milestones.map((m) => (
          <option key={m.id} value={m.id}>
            {m.title}
          </option>
        ))}
      </select>
    </div>
  );
}
