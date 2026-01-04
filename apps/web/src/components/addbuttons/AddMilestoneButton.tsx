// AddMilestoneButton.tsx
"use client";

import { getContrastingText } from "@shared/utils/getContrastingText";

interface AddMilestoneButtonProps {
  onClick: () => void;
  modeColor?: string;
}

export function AddMilestoneButton({
  onClick,
  modeColor = "#000000",
}: AddMilestoneButtonProps) {
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
        Add milestone
      </span>

      {/* Button */}
      <button
        onClick={onClick}
        className="w-16 h-16 rounded-full shadow-xl flex items-center justify-center transition cursor-pointer hover:opacity-90"
        style={{
          backgroundColor: modeColor,
        }}
        aria-label="Add milestone"
      >
        <span
          className="triangle"
          style={{
            borderTopColor: textColor,
            transform: "scale(1.5)",
            transformOrigin: "center",
          }}
        />
      </button>
    </div>
  );
}
