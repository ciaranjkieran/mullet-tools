"use client";

import React from "react";
import { Task } from "@shared/types/Task";

type Props = {
  tasks: Task[];
  taskId: number | null;
  onChange?: (id: number | null) => void;
  modeColor?: string;
  label?: string;
  disabled?: boolean;
};

export default function TimerTaskSelect({
  tasks,
  taskId,
  onChange,
  modeColor = "#333",
  label = "Task",
  disabled = false,
}: Props) {
  if (tasks.length === 0) return null;

  return (
    <div>
      <label className="block text-sm font-medium mb-1 flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block w-3 h-3 rounded-full"
          style={{ backgroundColor: modeColor }}
        />
        {label}
      </label>
      <select
        disabled={disabled}
        value={taskId ?? ""}
        onChange={(e) =>
          onChange?.(e.target.value ? Number(e.target.value) : null)
        }
        className={`w-full border rounded-md px-2 py-1.5 text-sm ${
          disabled ? "opacity-60 cursor-not-allowed" : ""
        }`}
      >
        <option value="">None</option>
        {tasks.map((t) => (
          <option key={t.id} value={t.id}>
            {t.title}
          </option>
        ))}
      </select>
    </div>
  );
}
