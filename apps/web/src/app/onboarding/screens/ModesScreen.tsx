"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { SelectedMode } from "../types";

const PRESET_COLORS = [
  "#EF4444",
  "#F97316",
  "#F59E0B",
  "#84CC16",
  "#10B981",
  "#14B8A6",
  "#06B6D4",
  "#0284C7",
  "#3B82F6",
  "#6366F1",
  "#8B5CF6",
  "#A855F7",
  "#D946EF",
  "#EC4899",
  "#64748B",
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

  const selectedModes = modes
    .map((m, i) => ({ ...m, originalIndex: i }))
    .filter((m) => m.selected);
  const selectedCount = selectedModes.length;

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

      </div>

      {/* Mode grid */}
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {modes.map((mode, i) => (
          <button
            key={mode.label + i}
            onClick={() => toggle(i)}
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
        ))}
      </div>

      {/* Edit panel — shows all selected modes with editable name + color */}
      {editing && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-gray-900">
              Edit your selected Modes
            </p>
            <button
              onClick={() => setEditing(false)}
              className="text-gray-400 hover:text-gray-600 transition"
              aria-label="Close edit panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {selectedModes.length === 0 && (
            <p className="text-sm text-gray-400">
              Select some Modes above first.
            </p>
          )}

          {selectedModes.map((mode) => (
            <div
              key={mode.originalIndex}
              className="flex items-center gap-3"
            >
              <input
                className="flex-1 text-sm font-medium border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={mode.label}
                onChange={(e) =>
                  updateLabel(mode.originalIndex, e.target.value)
                }
              />
              <div className="flex gap-1.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => updateColor(mode.originalIndex, c)}
                    className="w-5 h-5 rounded-full border-2 transition"
                    style={{
                      backgroundColor: c,
                      borderColor:
                        mode.color === c ? "#111827" : "transparent",
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

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

        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-sm font-medium text-gray-500 hover:text-gray-800 transition"
          >
            Edit Modes now
          </button>
        )}
      </div>
    </div>
  );
}
