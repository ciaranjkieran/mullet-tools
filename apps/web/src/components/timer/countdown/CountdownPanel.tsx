// components/timer/CountdownPanel.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import CountdownSettingsCard from "./CountdownSettingsCard";
import Clock from "../clock/Clock";
import { useCountdown } from "../hooks/useCountdown";

type Props = {
  modeColor: string;
};

export default function CountdownPanel({ modeColor }: Props) {
  // controlled “settings” state (minutes/seconds inputs)
  const [cdMin, setCdMin] = useState(25);
  const [cdSec, setCdSec] = useState(0);

  const durationMs = useMemo(
    () => Math.max(0, cdMin * 60_000 + cdSec * 1_000),
    [cdMin, cdSec]
  );

  // hook
  const { isRunning, remainingMs, start, pause, reset, setDurationMs } =
    useCountdown(durationMs);

  // If user edits duration while paused, reflect immediately.
  // If running, keep the current countdown unless you prefer to live-adjust (then remove soft:true).
  useEffect(() => {
    setDurationMs(durationMs, { soft: true });
  }, [durationMs, setDurationMs]);

  return (
    <div className="space-y-6">
      {/* Display */}
      <div
        className="rounded-2xl border-2 p-6 flex items-center justify-between"
        style={{ borderColor: modeColor }}
      >
        <Clock ms={remainingMs} />
        <div className="flex gap-3">
          {!isRunning ? (
            <button
              onClick={start}
              className="px-4 py-2 rounded-md text-sm font-semibold"
              style={{ backgroundColor: modeColor, color: "white" }}
            >
              Start
            </button>
          ) : (
            <button
              onClick={pause}
              className="px-4 py-2 rounded-md text-sm font-semibold border"
              style={{ borderColor: modeColor, color: modeColor }}
            >
              Pause
            </button>
          )}
          <button
            onClick={() => reset()} // resets to current settings
            className="px-4 py-2 rounded-md text-sm"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Settings */}
      <CountdownSettingsCard
        cdMin={cdMin}
        cdSec={cdSec}
        setCdMin={setCdMin}
        setCdSec={setCdSec}
        modeColor={modeColor}
      />
    </div>
  );
}
