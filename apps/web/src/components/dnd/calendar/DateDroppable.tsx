// src/dnd/DateDroppable.tsx
"use client";
import { useDroppable } from "@dnd-kit/core";
import { dateId } from "./calendarDndIds";
import clsx from "clsx";

export function DateDroppable({
  dateStr,
  disabled = false,
  children,
}: {
  dateStr: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: dateId(dateStr),
    disabled,
  });
  return (
    <div
      ref={setNodeRef}
      className={clsx(isOver && !disabled && "ring-1 ring-gray-300 rounded-sm")}
    >
      {children}
    </div>
  );
}
