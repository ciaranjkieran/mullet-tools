// src/components/dnd/calendar/CalendarDragOverlay.tsx
"use client";

import * as React from "react";
import { GripVertical } from "lucide-react";

export default function CalendarDragOverlay({
  count,
  noun = "task",
}: {
  count: number;
  noun?: string; // e.g. "task"
}) {
  const label = `${count} ${count === 1 ? noun : `${noun}s`}`;
  return (
    <div className="pointer-events-none select-none">
      <div className="flex items-center gap-2 rounded-full px-3 py-2 bg-black/85 text-white shadow-2xl">
        <GripVertical className="w-4 h-4" />
        <span className="text-sm font-semibold">{label}</span>
      </div>
    </div>
  );
}
