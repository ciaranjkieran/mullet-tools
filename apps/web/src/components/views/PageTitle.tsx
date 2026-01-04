"use client";

import { useViewStore } from "@shared/store/useViewStore";
import { useTimerUIStore } from "../../lib/store/useTimerUIStore";

export default function PageTitle() {
  const viewType = useViewStore((s) => s.viewType);
  const clockType = useTimerUIStore((s) => s.clockType);

  const titleMap = {
    calendar: "Calendar",
    comments: "Comments",
    notes: "Notes",
    boards: "Boards",
    templates: "Templates",
    stats: "Stats",
    timer: clockType === "timer" ? "Timer" : "Stopwatch", // 👈 dynamic here
  } as const;

  const title = (titleMap as Record<string, string>)[viewType] ?? "Home";

  return <h1 className="text-3xl font-bold">{title}</h1>;
}
