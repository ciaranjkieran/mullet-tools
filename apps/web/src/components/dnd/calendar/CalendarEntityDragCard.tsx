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

  attributes?: AnyAttributes;
  listeners?: AnyListeners;

  // aliases (compat)
  dragAttributes?: AnyAttributes;
  dragListeners?: AnyListeners;

  // sortable-only
  transform?: React.CSSProperties["transform"];
  transition?: React.CSSProperties["transition"];
  setActivatorNodeRef?: ActivatorNodeRef;

  isDragging?: boolean;
  isSorting?: boolean;
};

type Props = {
  meta: DragMeta;
  variant?: Variant;
  disabled?: boolean;
  children: (bindings: DraggableBindings) => React.ReactNode;
};

function DraggableCard({
  meta,
  disabled,
  children,
}: {
  meta: DragMeta;
  disabled: boolean;
  children: Props["children"];
}) {
  const id = `${meta.entityType}:${meta.id}`;

  const draggable = useDraggable({
    id,
    data: meta,
    disabled,
  });

  const attributes = draggable.attributes as DragAttributes | undefined;
  const listeners = draggable.listeners as DragListeners | undefined;

  return (
    <div
      ref={draggable.setNodeRef}
      data-dnd-variant="draggable"
      data-dnd-entity={id}
    >
      {children({
        setNodeRef: draggable.setNodeRef as NodeRef,
        attributes,
        listeners,
        dragAttributes: attributes,
        dragListeners: listeners,
      })}
    </div>
  );
}

function SortableCard({
  meta,
  disabled,
  children,
}: {
  meta: DragMeta;
  disabled: boolean;
  children: Props["children"];
}) {
  const id = `${meta.entityType}:${meta.id}`;

  const sortable = useSortable({
    id,
    data: meta,
    disabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0 : 1, // gap so siblings slide smoothly
  };

  const attributes = sortable.attributes as SortableAttributes | undefined;
  const listeners = sortable.listeners as SortableListeners | undefined;

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className="will-change-transform transition-transform"
      data-dnd-variant="sortable"
      data-dnd-entity={id}
    >
      {children({
        setNodeRef: sortable.setNodeRef as NodeRef,
        attributes,
        listeners,
        dragAttributes: attributes,
        dragListeners: listeners,
        transform: style.transform,
        transition: style.transition,
        setActivatorNodeRef: sortable.setActivatorNodeRef,
        isDragging: sortable.isDragging,
        isSorting: sortable.isSorting,
      })}
    </div>
  );
}

export default function CalendarEntityDragCard({
  meta,
  variant = "draggable",
  disabled = false,
  children,
}: Props) {
  if (variant === "sortable") {
    return (
      <SortableCard meta={meta} disabled={disabled}>
        {children}
      </SortableCard>
    );
  }

  return (
    <DraggableCard meta={meta} disabled={disabled}>
      {children}
    </DraggableCard>
  );
}
