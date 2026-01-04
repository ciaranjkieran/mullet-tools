"use client";
import React from "react";
import { Mode } from "@shared/types/Mode";

type Props = {
  modes: Mode[];
  modeId: number;
  onChange?: (id: number) => void;
  variant?: "build" | "edit" | "batch";
  modeColor?: string; // ⬅️ NEW
};

export default function EditorModeSelect({
  modes,
  modeId,
  onChange,
  modeColor = "#333",
}: Props) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1 flex items-center gap-2">
        <div
          className="w-3.5 h-3.5 rounded-sm"
          style={{ backgroundColor: modeColor }}
        />
        Mode
      </label>
      <select
        value={modeId}
        onChange={(e) => onChange?.(Number(e.target.value))}
        className="w-full border rounded-md px-2 py-1.5 text-sm"
      >
        {modes.map((m) => (
          <option key={m.id} value={m.id}>
            {m.title}
          </option>
        ))}
      </select>
    </div>
  );
}
