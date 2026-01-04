"use client";
import React from "react";
import { Goal } from "@shared/types/Goal";
import { Target as TargetIcon } from "lucide-react";

type Props = {
  goals: Goal[];
  goalId: number | null;
  onChange?: (id: number | null) => void;
  locked?: boolean;
  error?: string;
  isMixed?: boolean;
  modeColor?: string;
  label?: string;
};

export default function EditorGoalSelect({
  goals,
  goalId,
  onChange,
  locked,
  error,
  isMixed,
  modeColor = "#333",
  label = "Goal",
}: Props) {
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
        disabled={locked}
        value={goalId ?? ""}
        onChange={(e) =>
          onChange?.(e.target.value ? Number(e.target.value) : null)
        }
        className={`w-full border rounded-md px-2 py-1.5 text-sm ${
          locked ? "opacity-60 cursor-not-allowed" : ""
        }`}
      >
        {isMixed && <option value="">— Mixed —</option>}
        <option value="">None</option>
        {goals.map((g) => (
          <option key={g.id} value={g.id}>
            {g.title}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
