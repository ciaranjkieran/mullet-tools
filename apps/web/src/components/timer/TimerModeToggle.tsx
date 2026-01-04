import { ReactNode } from "react";
import { getContrastingText } from "@shared/utils/getContrastingText";

type Props<T extends string> = {
  value: T;
  onChange: (v: T) => void;
  options?: { value: T; label: ReactNode; title?: string }[];
  color: string;
};

export default function TimerModeToggle<T extends string>({
  value,
  onChange,
  options = [
    { value: "stopwatch" as T, label: "Stopwatch" },
    { value: "timer" as T, label: "Timer" },
  ],
  color,
}: Props<T>) {
  const text = getContrastingText(color);
  return (
    <div
      className="inline-flex p-1 rounded-xl border"
      style={{ borderColor: color }}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: active ? color : "transparent",
              color: active ? text : "inherit",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
