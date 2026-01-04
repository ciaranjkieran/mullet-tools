// components/entities/goals/dnd/dashboard/GoalCardDragDashboard.tsx
"use client";

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { Goal } from "@shared/types/Goal";
import { useModeStore } from "@shared/store/useModeStore";
import GoalRenderer from "../../renderers/dashboard/GoalRendererDashboard";
import { parseISO, differenceInCalendarDays, isBefore } from "date-fns";
import { useEntityUIStore } from "@/lib/store/useEntityUIStore";

type Props = {
  goal: Goal;
  onEdit?: (goal: Goal) => void;
  today?: Date;
  dialogOpen?: boolean;
};

export default function GoalCardDragDashboard({ goal, onEdit, today }: Props) {
  const mode = useModeStore((s) => s.modes.find((m) => m.id === goal.modeId));
  const modeColor = mode?.color || "#000";

  // ✅ persisted collapse
  const isCollapsed = useEntityUIStore((s) => !!s.collapsed.goal?.[goal.id]);

  // Only draggable when unscheduled AND collapsed
  const canDrag = !goal.dueDate && isCollapsed;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isSorting,
  } = useSortable({
    id: `goal-${goal.id}`,
    disabled: !canDrag,
    animateLayoutChanges: ({ isSorting, wasDragging }) =>
      !(isSorting || wasDragging),
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging || isSorting ? undefined : transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0 : 1,
  };

  const descriptionLabel =
    today && goal.dueDate && isBefore(parseISO(goal.dueDate), today)
      ? `${differenceInCalendarDays(today, parseISO(goal.dueDate))} day${
          differenceInCalendarDays(today, parseISO(goal.dueDate)) !== 1
            ? "s"
            : ""
        } ago`
      : undefined;

  if (!mode) return null;

  return (
    <div ref={setNodeRef} style={style} data-goal-id={goal.id}>
      <GoalRenderer
        goal={goal}
        mode={mode}
        modeColor={modeColor}
        // ⬇️ pass handle listeners only when draggable
        {...(canDrag
          ? { dragHandleProps: { ...listeners, ...attributes } }
          : {})}
      />
      {descriptionLabel && (
        <p className="text-xs text-gray-500 pl-8 mt-1">{descriptionLabel}</p>
      )}
    </div>
  );
}
