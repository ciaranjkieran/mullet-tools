"use client";

import { Goal } from "@shared/types/Goal";
import GoalRendererCalendar from "../../renderers/calendar/GoalRendererCalendar";
import { useModeStore } from "@shared/store/useModeStore";

type Props = {
  goal: Goal;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onEdit?: (project: Goal) => void;
  dialogOpen?: boolean;
  today?: Date;
  showModeTitle?: boolean;
};

export default function GoalCardDragCalendar({
  goal,
  onEdit,
  showModeTitle,
}: Props) {
  const mode = useModeStore((s) => s.modes.find((m) => m.id === goal.modeId));

  if (!mode) return null;

  return (
    <div data-project-id={goal.id}>
      <GoalRendererCalendar
        goal={goal}
        mode={mode}
        onEdit={onEdit}
        showModeTitle={showModeTitle}
      />
    </div>
  );
}
