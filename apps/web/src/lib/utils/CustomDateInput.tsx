"use client";

import { useRef } from "react";

type Props = {
  value: string;
  onChange: (val: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void; // ✅ New
};

export default function CustomDateInput({ value, onChange, onKeyDown }: Props) {
  const dateRef = useRef<HTMLInputElement>(null);

  const openDatePicker = () => {
    if (dateRef.current?.showPicker) {
      dateRef.current.showPicker();
    } else {
      dateRef.current?.click();
    }
  };

  return (
    <div className="relative w-fit">
      {/* Text input for typing the date */}
      <input
        type="text"
        placeholder="YYYY-MM-DD"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown} // ✅ Pass it through
        className="border p-2 rounded text-sm pr-10"
      />

      {/* Icon button that triggers date picker */}
      <button
        type="button"
        onClick={openDatePicker}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer"
      >
        📅
      </button>

      {/* Hidden native input (just off-screen, not top-left) */}
      <input
        ref={dateRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute opacity-0 w-0 h-0 pointer-events-none"
        tabIndex={-1}
      />
    </div>
  );
}
