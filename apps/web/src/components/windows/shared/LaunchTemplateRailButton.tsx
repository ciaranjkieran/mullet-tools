// components/windows/shared/LaunchTemplateRailButton.tsx
"use client";
import { FileStack } from "lucide-react";
import { getContrastingText } from "@shared/utils/getContrastingText";

export default function LaunchTemplateRailButton({
  onClick,
  modeColor,
  title = "Launch as Template",
}: {
  onClick: () => void;
  modeColor: string;
  title?: string;
}) {
  return (
    <div className="relative inline-flex items-center group">
      {/* Custom tooltip */}
      <span
        className="
          tip-bubble
          absolute right-full mr-3 top-1/2 -translate-y-1/2
          opacity-0 group-hover:opacity-100
        "
      >
        {title}
      </span>

      <button
        type="button"
        onClick={onClick}
        aria-label={title}
        className="
          w-11 h-11 rounded-full flex items-center justify-center
          shadow-md ring-1 ring-white/70
          hover:scale-105 active:scale-95
          transition-transform
        "
        style={{ backgroundColor: modeColor }}
      >
        <FileStack className="w-5 h-5" style={{ color: getContrastingText(modeColor) }} />
      </button>
    </div>
  );
}
