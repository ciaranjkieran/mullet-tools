"use client";

import clsx from "clsx";
import { GripVertical } from "lucide-react";
import * as React from "react";
import { EntityType } from "../../lib/store/useSelectionStore";

type ButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "type" | "id" | "onClick"
>;

type Props = {
  entityKind: EntityType;
  entityId: number;
  canDrag?: boolean;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  activatorRef?: (el: HTMLElement | null) => void;
} & ButtonProps;

export default function EntityDragHandle({
  entityKind,
  entityId,
  canDrag = true,
  className,
  activatorRef,
  onClick,
  ...rest
}: Props) {
  // Suppress unused-var lint — kept for API compatibility
  void entityKind;
  void entityId;

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
      ref={(el) => activatorRef?.(el)}
      type="button"
      aria-label="Drag"
      data-drag-handle
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      className={clsx(
        "p-1 rounded transition",
        canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        "text-gray-800 hover:text-gray-950",
        className
      )}
      {...sanitizedRest}
    >
      <GripVertical className="w-4 h-4" strokeWidth={2.5} />
    </button>
  );
}
