"use client";

import type { ActiveTimerDTO, Kind } from "@shared/types/Timer";
import { getContrastingText } from "@shared/utils/getContrastingText";
import { useState } from "react";
import type { CSSProperties } from "react";

type Props = {
  active: ActiveTimerDTO | null;
  clockType: Kind; // "stopwatch" | "timer"
  /** Used only to trigger re-renders; actual time is Date.now() */
  now: number;
  durationSec?: number;
  cdMin?: number;
  cdSec?: number;
  modeColor: string;
  activeColor: string;
  onStart: () => void;
  onStop: () => void;
  /** When the active timer payload was last fetched from the server (ms since epoch) */
  fetchedAtMs?: number; // optional
};

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}
function toMMSS(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${pad2(m)}:${pad2(rem)}`;
}

export default function TimerClockHeader({
  active,
  clockType,
  now: _now, // used only to trigger re-render
  durationSec = 0,
  cdMin,
  cdSec,
  modeColor,
  activeColor: _activeColor, // intentionally unused
  onStart,
  onStop,
  fetchedAtMs,
}: Props) {
  const nowMs = Date.now();

  let displaySec = 0;
  let running = false;

  if (active) {
    running = true;

    // Safely read possibly-present fields not declared on ActiveTimerDTO
    const a = active as unknown as Record<string, unknown>;
    const elapsedSeconds = a["elapsedSeconds"];
    const remainingSeconds = a["remainingSeconds"];

    if (active.kind === "stopwatch") {
      // Prefer server-supplied elapsedSeconds (if present), then tick locally
      if (typeof elapsedSeconds === "number") {
        if (typeof fetchedAtMs === "number") {
          const dtSec = (nowMs - fetchedAtMs) / 1000;
          displaySec = Math.max(0, Math.floor(elapsedSeconds + dtSec));
        } else {
          displaySec = Math.max(0, Math.floor(elapsedSeconds));
        }
      } else {
        // Fallback: derive from startedAt
        const startedAtMs = Date.parse(active.startedAt);
        displaySec = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
      }
    } else {
      if (
        typeof remainingSeconds === "number" &&
        typeof fetchedAtMs === "number"
      ) {
        const decayed = remainingSeconds - (nowMs - fetchedAtMs) / 1000;
        displaySec = Math.max(0, Math.ceil(decayed));
      } else if (active.endsAt) {
        const endsAtMs = Date.parse(active.endsAt);
        displaySec = Math.max(0, Math.ceil((endsAtMs - nowMs) / 1000));
      } else {
        const startedAtMs = Date.parse(active.startedAt);
        const elapsedSec = Math.max(
          0,
          Math.floor((nowMs - startedAtMs) / 1000)
        );
        const planned =
          typeof active.plannedSeconds === "number"
            ? active.plannedSeconds
            : durationSec;
        displaySec = Math.max(0, Math.ceil(planned - elapsedSec));
      }
    }
  } else {
    running = false;
    displaySec = clockType === "stopwatch" ? 0 : Math.max(0, durationSec);
  }

  const label = toMMSS(displaySec);

  const [hoverStart, setHoverStart] = useState(false);
  const [hoverStop, setHoverStop] = useState(false);

  const startFg = getContrastingText(modeColor);
  const stopBase = "#991B1B";

  const startStyle: CSSProperties = hoverStart
    ? {
        backgroundColor: "#FFFFFF",
        color: modeColor,
        borderColor: modeColor,
        borderWidth: 2,
        borderStyle: "solid",
      }
    : {
        backgroundColor: modeColor,
        color: startFg,
        border: "2px solid transparent",
      };

  const stopStyle: CSSProperties = hoverStop
    ? {
        backgroundColor: "#FFFFFF",
        color: stopBase,
        borderColor: stopBase,
        borderWidth: 2,
        borderStyle: "solid",
      }
    : {
        backgroundColor: stopBase,
        color: "#FFFFFF",
        border: "2px solid transparent",
      };

  return (
    <div
      className="rounded-2xl border-2 p-6 flex items-center justify-between"
      style={{ borderColor: modeColor }}
    >
      <div className="flex items-baseline gap-4">
        <span className="tabular-nums text-5xl font-semibold">{label}</span>
        <span className="text-sm text-gray-500">
          {active
            ? active.kind === "stopwatch"
              ? "elapsed"
              : "remaining"
            : clockType === "stopwatch"
            ? "ready"
            : `preset${cdMin != null ? ` · ${cdMin}m` : ""}${
                cdSec ? `:${pad2(cdSec)}` : ""
              }`}
        </span>
      </div>

      <div className="flex gap-3">
        {running ? (
          <button
            onClick={onStop}
            className="px-4 py-2 rounded-md text-base font-semibold transition-colors"
            style={stopStyle}
            onMouseEnter={() => setHoverStop(true)}
            onMouseLeave={() => setHoverStop(false)}
          >
            Stop
          </button>
        ) : (
          <button
            onClick={onStart}
            className="px-4 py-2 rounded-md text-base font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={startStyle}
            onMouseEnter={() => setHoverStart(true)}
            onMouseLeave={() => setHoverStart(false)}
            disabled={clockType === "timer" && durationSec <= 0}
          >
            Start
          </button>
        )}
      </div>
    </div>
  );
}
