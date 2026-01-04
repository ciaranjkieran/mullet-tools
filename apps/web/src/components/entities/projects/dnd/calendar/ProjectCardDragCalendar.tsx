"use client";

import { Project } from "@shared/types/Project";
import ProjectRendererCalendar from "../../renderers/calendar/ProjectRendererCalendar";
import { useModeStore } from "@shared/store/useModeStore";

type Props = {
  project: Project;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onEdit?: (project: Project) => void;
  dialogOpen?: boolean;
  today?: Date;
  showModeTitle?: boolean;
  breadcrumb?: string;
};

export default function ProjectCardDragCalendar({
  project,
  onEdit,
  showModeTitle,
  breadcrumb,
}: Props) {
  const mode = useModeStore((s) =>
    s.modes.find((m) => m.id === project.modeId)
  );

  if (!mode) return null;

  return (
    <div data-project-id={project.id}>
      <ProjectRendererCalendar
        project={project}
        mode={mode}
        onEdit={onEdit}
        showModeTitle={showModeTitle}
        breadcrumb={breadcrumb}
      />
    </div>
  );
}
