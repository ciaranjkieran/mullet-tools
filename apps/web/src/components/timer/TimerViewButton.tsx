"use client";

import { CSSProperties } from "react";
import { Hourglass, Timer } from "lucide-react";
import { useTimerUIStore } from "@/lib/store/useTimerUIStore";

type Props = {
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
};

export default function TimerViewButton({
  className = "",
  style,
  onClick,
}: Props) {
  const clockType = useTimerUIStore((s) => s.clockType);
  const label = clockType === "timer" ? "Timer" : "Stopwatch";

  return (
    <div className="relative inline-flex items-center group">
      <span
        className="pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 
                   whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs 
                   font-medium text-white shadow-lg opacity-0 transition-opacity
                   group-hover:opacity-100"
      >
        {label}
      </span>

      <button
        type="button"
        onClick={onClick}
        className={className}
        style={style}
        aria-label="Switch to Timer View"
      >
        {clockType === "timer" ? (
          <Hourglass className="w-6 h-6 text-black" />
        ) : (
          <Timer className="w-6 h-6 text-black" />
        )}
      </button>
    </div>
  );
}
