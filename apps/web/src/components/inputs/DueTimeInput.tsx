"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  dueTime: string;
  setDueTime: (val: string) => void;
};

export default function DueTimeInput({ dueTime, setDueTime }: Props) {
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [focused, setFocused] = useState<"h" | "m" | null>(null);
  const minutesRef = useRef<HTMLInputElement>(null);

  // Only pull from parent when we're not actively typing in that field
  useEffect(() => {
    if (!dueTime) {
      if (!focused) {
        setHours("");
        setMinutes("");
      }
      return;
    }
    const [h = "", m = ""] = dueTime.split(":");
    if (focused !== "h") setHours(h.slice(0, 2));
    if (focused !== "m") setMinutes(m.slice(0, 2));
  }, [dueTime, focused]);

  const digits2 = (v: string) => v.replace(/\D/g, "").slice(0, 2);

  const clampPad = (v: string, max: number) => {
    if (v === "") return "";
    const n = Math.min(Math.max(parseInt(v, 10) || 0, 0), max);
    return String(n).padStart(2, "0");
  };

  const emitIfComplete = (h: string, m: string) => {
    if (h.length === 2 && m.length === 2) {
      setDueTime(`${h}:${m}`);
    } else if (h === "" && m === "") {
      setDueTime("");
    } else {
      // Do not emit partials to avoid bouncing the caret/zero-padding mid-typing
    }
  };

  const onHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = digits2(e.target.value);
    setHours(v);
    if (v.length === 2) {
      minutesRef.current?.focus();
    }
    emitIfComplete(
      v.padStart(2, "0").slice(0, 2),
      minutes.padStart(2, "0").slice(0, 2)
    );
  };

  const onMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = digits2(e.target.value);
    setMinutes(v);
    emitIfComplete(
      hours.padStart(2, "0").slice(0, 2),
      v.padStart(2, "0").slice(0, 2)
    );
  };

  const onHoursBlur = () => {
    setFocused(null);
    const h = clampPad(hours, 23);
    setHours(h);
    // Emit on blur (use "00" if minutes empty so value is valid)
    const m = minutes === "" ? "00" : clampPad(minutes, 59);
    setMinutes(minutes === "" ? minutes : m); // don't force "00" visually unless minutes was typed
    setDueTime(`${h || "00"}:${m || "00"}`);
  };

  const onMinutesBlur = () => {
    setFocused(null);
    const h = hours === "" ? "00" : clampPad(hours, 23);
    const m = clampPad(minutes, 59);
    if (hours !== "") setHours(h); // only pad/normalize hours if user touched it
    setMinutes(m);
    setDueTime(`${h}:${m || "00"}`);
  };

  const preventWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    (e.target as HTMLInputElement).blur();
  };

  return (
    <div>
      <label className="block text-base font-medium mb-2">Due Time</label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          aria-label="Hours"
          placeholder="HH"
          className="w-16 border px-2 py-1.5 rounded-md text-sm text-center"
          value={hours}
          onFocus={() => setFocused("h")}
          onChange={onHoursChange}
          onBlur={onHoursBlur}
          onWheel={preventWheel}
        />
        <span className="text-sm font-medium select-none">:</span>
        <input
          ref={minutesRef}
          type="text"
          inputMode="numeric"
          aria-label="Minutes"
          placeholder="MM"
          className="w-16 border px-2 py-1.5 rounded-md text-sm text-center"
          value={minutes}
          onFocus={() => setFocused("m")}
          onChange={onMinutesChange}
          onBlur={onMinutesBlur}
          onWheel={preventWheel}
        />
      </div>
    </div>
  );
}
