"use client";
import React from "react";
import { Mode } from "@shared/types/Mode";

type Props = {
  modes: Mode[];
  modeId: number | null;
  onChange?: (id: number) => void;
  variant?: "build" | "edit" | "batch";
  modeColor?: string; // ⬅️ NEW
  placeholder?: string;
};

export default function EditorModeSelect({
  modes,
  modeId,
  onChange,
  modeColor = "#333",
  placeholder,
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
        value={modeId ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          if (v !== "") onChange?.(Number(v));
        }}
        className="w-full border rounded-md px-2 py-1.5 text-sm"
      >
        {placeholder && modeId == null && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {modes.map((m) => (
          <option key={m.id} value={m.id}>
            {m.title}
          </option>
        ))}
      </select>
    </div>
  );
}
