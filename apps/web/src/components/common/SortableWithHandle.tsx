// components/dnd/SortableWithHandle.tsx
"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type DragHandleProps = React.HTMLAttributes<HTMLButtonElement>;

type SortableWithHandleProps = {
  id: string | number;
  disabled?: boolean;
  children: (args: { handleProps: DragHandleProps }) => React.ReactNode;
};

export default function SortableWithHandle({
  id,
  disabled = false,
  children,
}: SortableWithHandleProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children({ handleProps: { ...attributes, ...listeners } })}
    </div>
  );
}
