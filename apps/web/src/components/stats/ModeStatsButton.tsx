"use client";

import { CSSProperties } from "react";
import { BarChart3 as StatsIcon } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
  className?: string;
  style?: CSSProperties;
  modeColor: string;
};

export default function ModeStatsButton({ className = "", style }: Props) {
  const router = useRouter();

  return (
    <div className="relative inline-flex items-center group">
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
        onClick={() => router.replace("/dashboard/stats")}
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
