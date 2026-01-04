"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

export type StatsPieSegment = {
  label: string;
  seconds: number;
  /** Optional per-segment colour (e.g. mode.color). Falls back to `color` prop if omitted. */
  color?: string;
};

type StatsPieChartProps = {
  totalSeconds: number;
  segments: StatsPieSegment[];
  /** Fallback colour when a segment has no explicit colour. */
  color: string;
  maxSlices?: number;
  /** If true, draw all slices at full opacity (no shading ramp). */
  solid?: boolean;
};

export function StatsPieChart({
  totalSeconds,
  segments,
  color,
  maxSlices, // kept for API compatibility (unused now)
  solid = false,
}: StatsPieChartProps) {
  const [open, setOpen] = useState(false);

  const slices = useMemo(() => {
    if (!totalSeconds || totalSeconds <= 0) return [];

    // 🔹 Use ALL positive segments, no "Other" bucketing.
    const positive = segments
      .filter((s) => s.seconds > 0)
      .sort((a, b) => b.seconds - a.seconds); // largest first

    return positive;
  }, [segments, totalSeconds]);

  if (!slices.length) return null;

  const total = slices.reduce((sum, s) => sum + s.seconds, 0);
  if (!total) return null;

  // SVG donut settings
  const radius = 16;
  const circumference = 2 * Math.PI * radius;

  let accumulated = 0;
  const opacities = [1, 0.85, 0.7, 0.55, 0.4, 0.3, 0.25, 0.2];

  return (
    <div className="flex flex-col items-end gap-1">
      {/* Icon-only toggle: pie + inset chevron */}
      <button
        type="button"
        title="Breakdown"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-16 w-16 items-center justify-center rounded-full outline-none"
      >
        <svg viewBox="0 0 40 40" className="h-16 w-16">
          {/* Background circle */}
          <circle
            cx="20"
            cy="20"
            r={radius}
            fill="transparent"
            stroke="#E5E7EB"
            strokeWidth="8"
          />
          {slices.map((slice, idx) => {
            const value = slice.seconds;
            const fraction = value / total;
            const dash = fraction * circumference;
            const gap = circumference - dash;

            const offset = accumulated;
            accumulated -= dash;

            const opacity = solid
              ? 1
              : opacities[idx] ?? opacities[opacities.length - 1];
            const strokeColor = slice.color ?? color;

            return (
              <circle
                key={slice.label + idx}
                cx="20"
                cy="20"
                r={radius}
                fill="transparent"
                stroke={strokeColor}
                strokeOpacity={opacity}
                strokeWidth="8"
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={offset}
                transform="rotate(-90 20 20)"
                style={{
                  transition: "stroke-dashoffset 150ms ease-out",
                }}
              />
            );
          })}
        </svg>

        <div
          className="pointer-events-none absolute bottom-[-4px] right-[-4px] flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md"
          style={{ border: `2px solid ${color}` }} // fallback border colour
        >
          <ChevronDown
            className={`transition-transform ${open ? "rotate-180" : ""}`}
            style={{
              width: "18px",
              height: "18px",
              strokeWidth: 2.5,
              color,
            }}
          />
        </div>
      </button>

      {open && (
        <div className="mt-1 max-w-xs rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs shadow-sm">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Time distribution
          </div>
          <ul className="space-y-1">
            {slices.map((slice, idx) => {
              const pct = (slice.seconds / total) * 100;
              const opacity = solid
                ? 1
                : opacities[idx] ?? opacities[opacities.length - 1];
              const swatchColor = slice.color ?? color;

              return (
                <li key={slice.label + idx} className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-sm"
                    style={{
                      backgroundColor: swatchColor,
                      opacity,
                    }}
                  />
                  <span className="flex-1 truncate text-gray-700">
                    {slice.label}
                  </span>
                  <span className="whitespace-nowrap text-gray-500">
                    {pct.toFixed(0)}%
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
