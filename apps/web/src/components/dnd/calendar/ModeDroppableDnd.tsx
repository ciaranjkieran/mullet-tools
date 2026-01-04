"use client";
import { useDroppable } from "@dnd-kit/core";
import { modeBand } from "./calendarDndIds";
import clsx from "clsx";

export function ModeDroppable({
  modeId,
  dateStr,
  disabled = false,
  children,
}: {
  modeId: number;
  dateStr: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: modeBand(modeId, dateStr),
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      aria-disabled={disabled || undefined}
      className={clsx(
        !disabled && isOver && "outline outline-1 outline-gray-300 rounded-sm"
      )}
    >
      {children}
    </div>
  );
}
