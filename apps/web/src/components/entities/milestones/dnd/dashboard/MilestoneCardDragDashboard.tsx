// components/entities/milestones/dnd/dashboard/MilestoneCardDragDashboard.tsx
"use client";

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { Milestone } from "@shared/types/Milestone";
import MilestoneRenderer from "../../renderers/dashboard/MilestoneRendererDashboard";
import { useModeStore } from "@shared/store/useModeStore";
import { useEntityUIStore } from "@/lib/store/useEntityUIStore";

type Props = {
  milestone: Milestone;
  dialogOpen?: boolean;
  variant?: undefined | "title";
};

export default function MilestoneCardDragDashboard({
  milestone,
  variant,
}: Props) {
  const mode = useModeStore((s) =>
    s.modes.find((m) => m.id === milestone.modeId)
  );
  const modeColor = mode?.color || "#000";

  // ✅ persisted collapse
  const isCollapsed = useEntityUIStore(
    (s) => !!s.collapsed.milestone?.[milestone.id]
  );

  // Only draggable when unscheduled AND collapsed
  const canDrag = !milestone.dueDate && isCollapsed;

  // dnd-kit sortable config
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isSorting,
  } = useSortable({
    id: `milestone-${milestone.id}`,
    disabled: !canDrag,
    animateLayoutChanges: ({ isSorting, wasDragging }) =>
      !(isSorting || wasDragging),
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging || isSorting ? undefined : transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0 : 1, // leave a gap while dragging
  };

  if (!mode) return null;

  return (
    <div ref={setNodeRef} style={style} data-milestone-id={milestone.id}>
      <MilestoneRenderer
        milestone={milestone}
        mode={mode}
        modeColor={modeColor}
        variant={variant}
        // ⬇️ Pass handle listeners ONLY when draggable
        {...(canDrag
          ? { dragHandleProps: { ...listeners, ...attributes } }
          : {})}
      />
    </div>
  );
}
