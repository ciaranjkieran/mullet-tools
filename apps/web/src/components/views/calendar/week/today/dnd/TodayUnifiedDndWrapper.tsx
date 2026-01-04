"use client";

import { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

interface Props {
  dateStr: string;
  children: ReactNode;
  sortableItems: string[];
}

export default function TodayUnifiedDndWrapper({
  dateStr,
  children,
  sortableItems,
}: Props) {
  const { setNodeRef } = useDroppable({
    id: dateStr,
    data: { dateStr },
  });

  return (
    <SortableContext
      id={`sortable-${dateStr}`}
      items={sortableItems}
      strategy={verticalListSortingStrategy}
    >
      <div
        className="space-y-2 min-h-[64px] bg-gray-50 rounded-sm p-2"
        ref={setNodeRef}
      >
        {children}
      </div>
    </SortableContext>
  );
}
