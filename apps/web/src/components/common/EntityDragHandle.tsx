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
  canDrag?: boolean;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  activatorRef?: (el: HTMLElement | null) => void;
} & ButtonProps;

function stopNativeImmediatePropagation(e: React.SyntheticEvent) {
  // Keep original behavior: call stopImmediatePropagation if it exists.
  const native = e.nativeEvent as unknown;
  if (
    native &&
    typeof native === "object" &&
    "stopImmediatePropagation" in native &&
    typeof (native as { stopImmediatePropagation?: unknown })
      .stopImmediatePropagation === "function"
  ) {
    (
      native as { stopImmediatePropagation: () => void }
    ).stopImmediatePropagation();
  }
}

export default function EntityDragHandle({
  entityKind,
  entityId,
  canDrag = true,
  className,
  activatorRef,
  onClick,
  ...rest
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
      ref={(el) => activatorRef?.(el)} // ✅ no `as any`, same behavior
      type="button"
      aria-label="Drag"
      aria-pressed={isSelected}
      data-drag-handle
      onClick={(e) => {
        e.stopPropagation();
        stopNativeImmediatePropagation(e); // ✅ same intent as before
        toggle(entityKind, entityId);
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
