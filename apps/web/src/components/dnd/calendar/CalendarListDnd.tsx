"use client";
import { useDroppable } from "@dnd-kit/core";
import { listId, EntityType } from "./calendarDndIds";
import clsx from "clsx";

export function CalendarListDnD({
  entityType,
  modeId,
  dateStr,
  disabled = false,
  children,
}: {
  entityType: EntityType;
  modeId: number;
  dateStr: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: listId(entityType, modeId, dateStr),
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      aria-disabled={disabled || undefined}
      className={clsx(!disabled && isOver && "ring-1 ring-gray-300 rounded-sm")}
    >
      {children}
    </div>
  );
}
