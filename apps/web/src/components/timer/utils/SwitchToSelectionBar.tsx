"use client";

import { Loader2, Shuffle } from "lucide-react";

type Props = {
  visible: boolean;
  disabled?: boolean;
  onSwitch: () => void;
  note?: string;
};

export default function SwitchToSelectionBar({
  visible,
  disabled,
  onSwitch,
  note = "You changed the selection. Switch the running timer to it?",
}: Props) {
  if (!visible) return null;

  return (
    <div className="sticky top-2 z-20">
      <div className="rounded-xl border bg-white/80 backdrop-blur px-4 py-3 shadow flex items-center justify-between">
        <div className="text-sm text-gray-700">{note}</div>
        <button
          onClick={onSwitch}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium border transition disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            borderColor: "var(--switch-color, #111827)",
            color: "var(--switch-color, #111827)",
          }}
        >
          {disabled ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Shuffle className="h-4 w-4" />
          )}
          Switch to Selection
        </button>
      </div>
    </div>
  );
}
