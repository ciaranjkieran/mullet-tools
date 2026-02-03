"use client";

import { CSSProperties } from "react";
import { BarChart3 as StatsIcon } from "lucide-react";

type Props = {
  className?: string;
  style?: CSSProperties;
  modeColor?: string; // keep optional for backwards compatibility
  onClick?: () => void;
};

export default function ModeStatsButton({
  className = "",
  style,
  onClick,
}: Props) {
  return (
    <div>
      <span
        className="pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 
                   whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs 
                   font-medium text-white shadow-lg opacity-0 transition-opacity
                   group-hover:opacity-100"
      >
        Stats
      </span>

      <button
        type="button"
        onClick={onClick}
        className={className}
        style={style}
        aria-label="Switch to Stats View"
        title="Stats"
      >
        <StatsIcon className="w-6 h-6 text-black" />
      </button>
    </div>
  );
}
