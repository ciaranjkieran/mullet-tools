"use client";

import React from "react";
import { Mode } from "@shared/types/Mode";

type Props = {
  modes: Mode[];
  modeId: number | null;
  onChange?: (id: number) => void;
  modeColor?: string;
  label?: string;
  disabled?: boolean;
};

export default function TimerModeSelect({
  modes,
  modeId,
  onChange,
  modeColor = "#333",
  label = "Mode",
  disabled = false,
}: Props) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1 flex items-center gap-2">
        <div
          className="w-3.5 h-3.5 rounded-sm"
          style={{ backgroundColor: modeColor }}
        />
        {label}
      </label>
      <select
        disabled={disabled}
        value={modeId ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          if (!v) return;
          const n = Number(v);
          if (!Number.isNaN(n)) onChange?.(n);
        }}
        className={`w-full border rounded-md px-2 py-1.5 text-sm ${
          disabled ? "opacity-60 cursor-not-allowed" : ""
        }`}
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
