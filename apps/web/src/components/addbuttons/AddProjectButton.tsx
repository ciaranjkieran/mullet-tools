// AddProjectButton.tsx
"use client";

import { FolderIcon } from "lucide-react";
import { getContrastingText } from "@shared/utils/getContrastingText";

interface AddProjectButtonProps {
  onClick: () => void;
  modeColor?: string;
}

export function AddProjectButton({
  onClick,
  modeColor = "#000000",
}: AddProjectButtonProps) {
  const textColor = getContrastingText(modeColor);

  return (
    <div className="relative inline-flex items-center group">
      {/* Tooltip */}
      <span
        className="pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 
                   whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs 
                   font-medium text-white shadow-lg opacity-0 transition-opacity
                   group-hover:opacity-100"
      >
        Add project
      </span>

      {/* Button */}
      <button
        onClick={onClick}
        className="w-16 h-16 rounded-full shadow-xl flex items-center justify-center transition cursor-pointer hover:opacity-90"
        style={{
          backgroundColor: modeColor,
          color: textColor,
        }}
        aria-label="Add project"
      >
        <FolderIcon
          className="w-6 h-6"
          style={{ fill: textColor, stroke: "none" }}
        />
      </button>
    </div>
  );
}
