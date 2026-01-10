"use client";

import { Milestone } from "@shared/types/Milestone";
import { Mode } from "@shared/types/Mode";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import MilestoneRendererCalendar from "../../renderers/calendar/MilestoneRendererCalendar";

type Props = {
  milestone: Milestone;
  mode: Mode | undefined;
  showModeTitle?: boolean;
  breadcrumb?: string;
};

export default function MilestoneCardDragCalendar({
  milestone,
  mode,
  showModeTitle,
  breadcrumb,
}: Props) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `milestone-${milestone.id}`,
    data: { type: "milestone", milestone },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <MilestoneRendererCalendar
        milestone={milestone}
        mode={mode}
        showModeTitle={showModeTitle}
        breadcrumb={breadcrumb}
      />
    </div>
  );
}
