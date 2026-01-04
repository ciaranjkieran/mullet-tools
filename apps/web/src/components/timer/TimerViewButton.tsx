"use client";

import { CSSProperties } from "react";
import { Hourglass, Timer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useViewStore } from "@shared/store/useViewStore";
import { useTimerUIStore } from "@/lib/store/useTimerUIStore";

type Props = {
  className?: string;
  style?: CSSProperties;
  modeColor: string;
};

export default function TimerViewButton({
  className = "",
  style,
  modeColor,
}: Props) {
  const router = useRouter();
  const viewType = useViewStore((s) => s.viewType);
  const isActive = viewType === "timer";

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
        onClick={() => router.replace("/dashboard/timer")}
        className={`
          p-3 rounded-full bg-white hover:bg-gray-100 transition cursor-pointer
          ${isActive ? "" : "border border-black"}
          ${className}
        `}
        style={{
          ...(isActive ? { boxShadow: `0 0 0 3px ${modeColor}` } : {}),
          ...style,
        }}
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
