"use client";

import React from "react";
import { Goal } from "@shared/types/Goal";
import { Target as TargetIcon } from "lucide-react";

type Props = {
  goals: Goal[];
  goalId: number | null;
  onChange?: (id: number | null) => void;
  modeColor?: string;
  label?: string;
  disabled?: boolean;
};

export default function TimerGoalSelect({
  goals,
  goalId,
  onChange,
  modeColor = "#333",
  label = "Goal",
  disabled = false,
}: Props) {
  if (goals.length === 0) return null;

  return (
    <div>
      <label className="block text-sm font-medium mb-1 flex items-center gap-2">
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center"
          style={{ backgroundColor: modeColor }}
        >
          <TargetIcon className="w-3.5 h-3.5 text-white" />
        </div>
        {label}
      </label>
      <select
        disabled={disabled}
        value={goalId ?? ""}
        onChange={(e) =>
          onChange?.(e.target.value ? Number(e.target.value) : null)
        }
        className={`w-full border rounded-md px-2 py-1.5 text-sm ${
          disabled ? "opacity-60 cursor-not-allowed" : ""
        }`}
      >
        <option value="">None</option>
        {goals.map((g) => (
          <option key={g.id} value={g.id}>
            {g.title}
          </option>
        ))}
      </select>
    </div>
  );
}
