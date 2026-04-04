"use client";

import { useState } from "react";
import type { SelectedMode } from "../types";

const PRESET_COLORS = [
  "#3B82F6",
  "#8B5CF6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#06B6D4",
  "#EC4899",
  "#F97316",
  "#64748B",
  "#14B8A6",
];

export default function ModesScreen({
  modes,
  onModesChange,
  onNext,
  busy,
}: {
  modes: SelectedMode[];
  onModesChange: (modes: SelectedMode[]) => void;
  onNext: () => void;
  busy: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const selectedCount = modes.filter((m) => m.selected).length;

  function toggle(index: number) {
    const updated = [...modes];
    updated[index] = { ...updated[index], selected: !updated[index].selected };
    onModesChange(updated);
  }

  function updateLabel(index: number, label: string) {
    const updated = [...modes];
    updated[index] = { ...updated[index], label };
    onModesChange(updated);
  }

  function updateColor(index: number, color: string) {
    const updated = [...modes];
    updated[index] = { ...updated[index], color };
    onModesChange(updated);
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
            Start with your Modes
          </h1>
          <p className="mt-3 text-lg text-gray-600">
            A Mode is a compartment &mdash; a dedicated space for one area of
            your life.
          </p>
        </div>

        {/* Image placeholder */}
        <div className="hidden md:flex w-40 h-28 rounded-xl bg-gray-100 items-center justify-center text-xs text-gray-400 font-medium shrink-0">
          IMAGE PLACEHOLDER
        </div>
      </div>

      {/* Mode grid */}
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {modes.map((mode, i) => (
          <div key={mode.label + i} className="relative">
            {editing && editIndex === i ? (
              <div className="rounded-xl border-2 border-gray-900 p-3 bg-white space-y-2">
                <input
                  className="w-full text-sm font-medium border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  value={mode.label}
                  onChange={(e) => updateLabel(i, e.target.value)}
                  autoFocus
                />
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => updateColor(i, c)}
                      className="w-5 h-5 rounded-full border-2 transition"
                      style={{
                        backgroundColor: c,
                        borderColor:
                          mode.color === c ? "#111827" : "transparent",
                      }}
                    />
                  ))}
                </div>
                <button
                  onClick={() => {
                    setEditIndex(null);
                    setEditing(false);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-800 font-medium"
                >
                  Done
                </button>
              </div>
            ) : (
              <button
                onClick={() => (editing ? setEditIndex(i) : toggle(i))}
                className={[
                  "w-full rounded-xl px-3 py-4 text-center transition border-2",
                  mode.selected
                    ? "border-gray-900 bg-gray-50"
                    : "border-gray-200 bg-white hover:border-gray-300",
                ].join(" ")}
              >
                <span className="text-2xl block">{mode.emoji}</span>
                <span
                  className={[
                    "mt-1 text-sm font-medium block",
                    mode.selected ? "text-gray-900" : "text-gray-500",
                  ].join(" ")}
                >
                  {mode.label}
                </span>
                {mode.selected && (
                  <div
                    className="mt-1.5 mx-auto w-3 h-3 rounded-full"
                    style={{ backgroundColor: mode.color }}
                  />
                )}
              </button>
            )}
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm text-gray-400">
        You can add, edit, or remove Modes at any time.
      </p>

      {/* Actions */}
      <div className="mt-8 flex flex-col items-center gap-3">
        <button
          onClick={onNext}
          disabled={selectedCount === 0 || busy}
          className="rounded-lg bg-gray-900 px-8 py-3 text-base font-semibold text-white hover:bg-gray-800 transition disabled:opacity-50"
        >
          {busy ? "Creating Modes..." : "Continue with these Modes"}
        </button>

        <button
          onClick={() => {
            if (editing) {
              setEditing(false);
              setEditIndex(null);
            } else {
              setEditing(true);
            }
          }}
          className="text-sm font-medium text-gray-500 hover:text-gray-800 transition"
        >
          {editing ? "Done editing" : "Edit Modes now"}
        </button>
      </div>
    </div>
  );
}
