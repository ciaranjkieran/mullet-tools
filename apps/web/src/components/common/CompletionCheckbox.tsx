"use client";

import { useState } from "react";
import { Check } from "lucide-react";

type Props = {
  modeColor: string;
  label: string;
  onComplete: () => void;
  shape?: "square" | "circle";
};

/** Returns true if the colour is "light" (white text needed = false) */
function isLight(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  // Perceived luminance
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

export default function CompletionCheckbox({
  modeColor,
  label,
  onComplete,
  shape = "square",
}: Props) {
  const [checked, setChecked] = useState(false);
  const checkColor = isLight(modeColor) ? "#1f2937" : "#ffffff";
  const borderRadius = shape === "circle" ? "9999px" : "3px";

  return (
    <button
      type="button"
      aria-label={label}
      className="flex-shrink-0 flex items-center justify-center cursor-pointer transition-all duration-200"
      style={{
        width: 18,
        height: 18,
        borderRadius,
        border: checked ? `1.5px solid ${modeColor}` : "1.5px solid #6b7280",
        backgroundColor: checked ? modeColor : "transparent",
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (checked) return;
        setChecked(true);
        onComplete();
      }}
    >
      {checked && (
        <Check
          className="animate-[scale-in_0.15s_ease-out]"
          style={{ color: checkColor }}
          size={13}
          strokeWidth={3}
        />
      )}
    </button>
  );
}
