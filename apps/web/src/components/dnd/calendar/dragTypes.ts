// src/dnd/dragTypes.ts
import type { useDraggable } from "@dnd-kit/core";
import type { useSortable } from "@dnd-kit/sortable";

export type DragAttributes = ReturnType<typeof useDraggable>["attributes"];
export type DragListeners = NonNullable<
  ReturnType<typeof useDraggable>["listeners"]
>;

export type SortableAttributes = ReturnType<typeof useSortable>["attributes"];
export type SortableListeners = NonNullable<
  ReturnType<typeof useSortable>["listeners"]
>;
export type ActivatorNodeRef = ReturnType<
  typeof useSortable
>["setActivatorNodeRef"];

export type NodeRef = (el: HTMLElement | null) => void;
