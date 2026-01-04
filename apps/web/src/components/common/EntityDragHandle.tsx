"use client";

import clsx from "clsx";
import { GripVertical } from "lucide-react";
import * as React from "react";
import {
  EntityType,
  useSelectionStore,
} from "../../lib/store/useSelectionStore";

type ButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "type" | "id" | "onClick"
>;

type Props = {
  entityKind: EntityType;
  entityId: number;
  canDrag?: boolean; // ← NEW
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  activatorRef?: (el: HTMLElement | null) => void; // ✅ NEW
} & ButtonProps;

export default function EntityDragHandle({
  entityKind,
  entityId,
  canDrag = true,
  className,
  activatorRef, // ✅ NEW

  onClick,
  ...rest // will contain dnd-kit listeners/attributes when canDrag=true
}: Props) {
  const isSelected = useSelectionStore((s) =>
    s.isSelected(entityKind, entityId)
  );
  const toggle = useSelectionStore((s) => s.toggle);

  // If dragging is disabled, strip pointer-down listeners to be safe
  const sanitizedRest = canDrag
    ? rest
    : {
        ...rest,
        onPointerDown: undefined,
        onMouseDown: undefined,
        onKeyDown: undefined,
        role: undefined,
        tabIndex: undefined,
      };

  return (
    <button
      ref={activatorRef as any} // ✅ hook up sortable activator
      type="button"
      aria-label="Drag"
      aria-pressed={isSelected}
      data-drag-handle
      onClick={(e) => {
        e.stopPropagation();
        (e as any).nativeEvent?.stopImmediatePropagation?.();
        toggle(entityKind, entityId);
        onClick?.(e);
      }}
      className={clsx(
        "p-1 rounded transition",
        canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer", // ← stays pointer on hover & active
        "text-gray-800 hover:text-gray-950",
        className
      )}
      {...sanitizedRest}
    >
      <GripVertical className="w-4 h-4" strokeWidth={2.5} />
    </button>
  );
}
