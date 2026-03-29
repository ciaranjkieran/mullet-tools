"use client";

import { useMemo } from "react";
import { X, ArrowLeft, LocateFixed } from "lucide-react";
import { useDialogStore, type FocusFrame } from "@/lib/dialogs/useDialogStore";

import { useGoalStore } from "@shared/store/useGoalStore";
import { useProjectStore } from "@shared/store/useProjectStore";
import { useMilestoneStore } from "@shared/store/useMilestoneStore";
import { useTaskStore } from "@shared/store/useTaskStore";
import { useModeStore } from "@shared/store/useModeStore";

import TaskSectionDashboard from "@/components/entities/tasks/containers/dashboard/TaskSectionDashboard";
import MilestoneList from "@/components/entities/milestones/containers/dashboard/MilestoneList";
import { buildMilestoneTree } from "@/components/entities/milestones/utils/MilestoneTreeBuilder";
import ProjectList from "@/components/entities/projects/containers/dashboard/ProjectList";
import { buildProjectTree } from "@/components/entities/projects/utils/buildProjectTree";

import { projectEffectiveGoalId } from "@shared/lineage/effective";

import type { Goal } from "@shared/types/Goal";
import type { Project } from "@shared/types/Project";
import type { Milestone } from "@shared/types/Milestone";
import type { Mode } from "@shared/types/Mode";

export default function FocusModal() {
  const isOpen = useDialogStore((s) => s.isFocusModalOpen);
  const stack = useDialogStore((s) => s.focusStack);
  const popFocus = useDialogStore((s) => s.popFocus);
  const closeFocusModal = useDialogStore((s) => s.closeFocusModal);

  const frame = stack[stack.length - 1];

  if (!isOpen || !frame) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-white pt-12">
      <div className="w-full max-w-3xl max-h-[85vh] flex flex-col mx-4 border border-gray-200 rounded-xl shadow-sm">
        <FocusModalContent
          key={`${frame.entityType}-${frame.entity.id}`}
          frame={frame}
          stackDepth={stack.length}
          onBack={popFocus}
          onClose={closeFocusModal}
        />
      </div>
    </div>
  );
}

// ── Inner content ──────────────────────────────────────────

function FocusModalContent({
  frame,
  stackDepth,
  onBack,
  onClose,
}: {
  frame: FocusFrame;
  stackDepth: number;
  onBack: () => void;
  onClose: () => void;
}) {
  const { entityType, entity, modeColor, modeId } = frame;

  const projects = useProjectStore((s) => s.projects);
  const milestones = useMilestoneStore((s) => s.milestones);
  const tasks = useTaskStore((s) => s.tasks);
  const modes = useModeStore((s) => s.modes);

  const mode = useMemo(
    () => modes.find((m) => m.id === modeId) ?? ({ id: modeId, color: modeColor, title: "" } as Mode),
    [modes, modeId, modeColor]
  );

  // Maps for lineage lookups
  const projectsById = useMemo(
    () => new Map<number, Project>(projects.map((p) => [p.id, p])),
    [projects]
  );
  // Build children based on entity type
  const { childTasks, milestoneTree, projectTree } = useMemo(() => {
    if (entityType === "goal") {
      const goal = entity as Goal;

      const ct = tasks.filter(
        (t) => t.goalId === goal.id && t.milestoneId == null && t.projectId == null
      );

      const mt = buildMilestoneTree(milestones, modeId, undefined, goal.id);

      const childProjects = projects.filter(
        (p) => projectEffectiveGoalId(p.id, projectsById) === goal.id
      );
      const pt = buildProjectTree(childProjects, null);

      return { childTasks: ct, milestoneTree: mt, projectTree: pt };
    }

    if (entityType === "project") {
      const proj = entity as Project;

      const ct = tasks.filter(
        (t) => t.projectId === proj.id && !t.milestoneId
      );

      const mt = buildMilestoneTree(milestones, modeId, proj.id);

      const childProjects = projects.filter((p) => p.parentId === proj.id);
      const pt = buildProjectTree(childProjects, proj.id);

      return { childTasks: ct, milestoneTree: mt, projectTree: pt };
    }

    // milestone
    const ms = entity as Milestone;

    const ct = tasks.filter((t) => t.milestoneId === ms.id);

    const mt = buildMilestoneTree(milestones, modeId, ms.projectId ?? undefined, ms.goalId ?? undefined, ms.id);

    return { childTasks: ct, milestoneTree: mt, projectTree: [] as ReturnType<typeof buildProjectTree> };
  }, [entityType, entity, tasks, milestones, projects, modeId, projectsById]);

  // Entity type icon
  const entityIcon = entityType === "goal" ? (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center"
      style={{ backgroundColor: modeColor }}
    >
      <LocateFixed size={16} className="text-white" />
    </div>
  ) : entityType === "project" ? (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center"
      style={{ backgroundColor: modeColor }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-4 h-4">
        <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h5.379a1.5 1.5 0 0 1 1.06.44l1.621 1.62H19.5A1.5 1.5 0 0 1 21 6.56V18a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 18V4.5Z" />
      </svg>
    </div>
  ) : (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center"
      style={{ backgroundColor: modeColor }}
    >
      <span
        className="triangle"
        style={{
          borderTopColor: "white",
          borderTopWidth: 10,
          borderLeftWidth: 6,
          borderRightWidth: 6,
        }}
      />
    </div>
  );

  // Edit handler
  const handleEditTitle = () => {
    const ds = useDialogStore.getState();
    if (entityType === "goal") {
      ds.setGoalToEdit(entity as Goal);
      ds.setIsGoalDialogOpen(true);
    } else if (entityType === "project") {
      ds.setProjectToEdit(entity as Project);
      ds.setIsProjectDialogOpen(true);
    } else {
      ds.setMilestoneToEdit(entity as Milestone);
      ds.setIsMilestoneDialogOpen(true);
    }
  };

  const isEmpty = childTasks.length === 0 && milestoneTree.length === 0 && projectTree.length === 0;

  return (
    <>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-3 rounded-t-xl border-b"
        style={{ backgroundColor: modeColor + "12" }}
      >
        <button
          onClick={onBack}
          className="p-1 rounded hover:bg-black/5 transition cursor-pointer"
          aria-label={stackDepth > 1 ? "Go back" : "Close"}
        >
          {stackDepth > 1 ? (
            <ArrowLeft size={20} className="text-gray-600" />
          ) : (
            <X size={20} className="text-gray-600" />
          )}
        </button>

        {entityIcon}

        <button
          onClick={handleEditTitle}
          className="flex-1 text-left min-w-0 cursor-pointer hover:opacity-80 transition"
        >
          <h2 className="text-lg font-bold text-gray-900 truncate">
            {entity.title}
          </h2>
        </button>

        {stackDepth > 1 && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-black/5 transition cursor-pointer"
            aria-label="Close all"
          >
            <X size={18} className="text-gray-400" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <LocateFixed size={32} className="mb-3 opacity-50" />
            <p className="text-sm">No child entities</p>
          </div>
        ) : (
          <>
            <TaskSectionDashboard
              tasks={childTasks}
              mode={mode}
              modes={modes}
              {...(entityType === "goal" && { goalId: entity.id })}
              {...(entityType === "project" && { projectId: entity.id })}
              {...(entityType === "milestone" && { milestoneId: entity.id })}
            />

            {milestoneTree.length > 0 && (
              <MilestoneList
                parentId={entityType === "milestone" ? entity.id : null}
                milestones={milestoneTree}
                depth={0}
                mode={mode}
                modes={modes}
                tasks={tasks}
                container={{ kind: entityType, id: entity.id }}
              />
            )}

            {projectTree.length > 0 && (
              <ProjectList
                parentId={entityType === "project" ? entity.id : null}
                projects={projectTree}
                depth={0}
                mode={mode}
                modes={modes}
                tasks={tasks}
                milestones={milestones}
                container={{ kind: entityType as "project" | "goal", id: entity.id }}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}
