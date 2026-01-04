// src/components/dnd/calendar/CalendarEntityDragCard.tsx
"use client";

import * as React from "react";
import { useDraggable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DragMeta } from "./calendarDndIds";

import type {
  DragAttributes,
  DragListeners,
  SortableAttributes,
  SortableListeners,
  ActivatorNodeRef,
  NodeRef,
} from "./dragTypes";

type Variant = "draggable" | "sortable";

// convenience unions
type AnyAttributes = DragAttributes | SortableAttributes | undefined;
type AnyListeners = DragListeners | SortableListeners | undefined;

type DraggableBindings = {
  setNodeRef: NodeRef;

  // canonical names
  attributes?: AnyAttributes;
  listeners?: AnyListeners;

  // aliases (compat with existing children)
  dragAttributes?: AnyAttributes;
  dragListeners?: AnyListeners;

  // present when variant === "sortable"
  transform?: React.CSSProperties["transform"];
  transition?: React.CSSProperties["transition"];
  setActivatorNodeRef?: ActivatorNodeRef;

  // optional flags (safe if unused)
  isDragging?: boolean;
  isSorting?: boolean;
};

type Props = {
  meta: DragMeta;
  variant?: Variant;
  disabled?: boolean;
  children: (bindings: DraggableBindings) => React.ReactNode;
};

export default function CalendarEntityDragCard({
  meta,
  variant = "draggable",
  disabled = false,
  children,
}: Props) {
  const draggableId = `${meta.entityType}:${meta.id}`;

  if (variant === "sortable") {
    const {
      attributes,
      listeners,
      setNodeRef,
      setActivatorNodeRef,
      transform,
      transition,
      isDragging,
      isSorting,
    } = useSortable({
      id: draggableId,
      data: meta,
      disabled,
    });

    const style: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
      // 👇 leave a gap so siblings slide smoothly
      opacity: isDragging ? 0 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className="will-change-transform transition-transform"
        data-dnd-variant="sortable"
        data-dnd-entity={`${meta.entityType}:${meta.id}`}
      >
        {children({
          setNodeRef: setNodeRef as NodeRef,
          attributes,
          listeners,
          // aliases for compatibility
          dragAttributes: attributes,
          dragListeners: listeners,
          transform: style.transform,
          transition: style.transition,
          setActivatorNodeRef,
          isDragging,
          isSorting,
        })}
      </div>
    );
  }

  // variant === "draggable"
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: draggableId,
    data: meta,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      data-dnd-variant="draggable"
      data-dnd-entity={`${meta.entityType}:${meta.id}`}
    >
      {children({
        setNodeRef: setNodeRef as NodeRef,
        attributes,
        listeners,
        // aliases for compatibility
        dragAttributes: attributes,
        dragListeners: listeners,
      })}
    </div>
  );
}
