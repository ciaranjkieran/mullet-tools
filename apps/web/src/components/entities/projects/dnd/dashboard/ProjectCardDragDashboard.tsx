// components/entities/projects/dnd/dashboard/ProjectCardDragDashboard.tsx
"use client";

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { Project } from "@shared/types/Project";
import ProjectRenderer from "../../renderers/dashboard/ProjectRendererDashboard";
import { useModeStore } from "@shared/store/useModeStore";
import { useEntityUIStore } from "@/lib/store/useEntityUIStore";

type Props = {
  project: Project;
  onEdit?: (project: Project) => void;
  dialogOpen?: boolean;
  variant?: undefined | "title";
};

export default function ProjectCardDragDashboard({
  project,
  onEdit,
  variant,
}: Props) {
  const mode = useModeStore((s) =>
    s.modes.find((m) => m.id === project.modeId)
  );
  const modeColor = mode?.color || "#000";

  // ✅ persisted collapse
  const isCollapsed = useEntityUIStore(
    (s) => !!s.collapsed.project?.[project.id]
  );

  // Only draggable when unscheduled AND collapsed
  const canDrag = !project.dueDate && isCollapsed;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isSorting,
  } = useSortable({
    id: `project-${project.id}`,
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

  if (!mode) return null;

  return (
    <div ref={setNodeRef} style={style} data-project-id={project.id}>
      <ProjectRenderer
        project={project}
        mode={mode}
        modeColor={modeColor}
        variant={variant}
        // ⬇️ pass handle listeners only when draggable
        {...(canDrag
          ? { dragHandleProps: { ...listeners, ...attributes } }
          : {})}
      />
    </div>
  );
}
