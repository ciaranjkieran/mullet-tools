// components/entities/projects/windows/ProjectWindow.tsx
"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import { Project } from "@shared/types/Project";
import { Mode } from "@shared/types/Mode";
import { Goal } from "@shared/types/Goal";
import ProjectCommentsTab from "./tabs/ProjectCommentsTab";
import {
  MessageCircle,
  Pencil,
  Puzzle,
  NotebookPen,
  LayoutGrid,
  BarChart3,
} from "lucide-react";
import ProjectNotesTab from "./tabs/ProjectNotesTab";
import EntityBoardsTab from "../../../windows/shared/EntityBoardsTab";
import { useUpdateProject } from "@shared/api/hooks/projects/useUpdateProject";
import { useDeleteProject } from "@shared/api/hooks/projects/useDeleteProject";
import EntityWindowShell, {
  Tab,
} from "@/components/windows/shared/EntityWindowShell";
import EditProjectForm from "./edit/EditProjectForm";
import ProjectStructureTab from "./tabs/ProjectStructureTab";
import { Milestone } from "@shared/types/Milestone";
import { Task } from "@shared/types/Task";
import { useDialogStore } from "@/lib/dialogs/useDialogStore";
import { useTimerUIStore } from "@/lib/store/useTimerUIStore";
import { useTemplateWorkbenchStore } from "@shared/store/useTemplateWorkbenchStore";
import { projectToTemplateData } from "@shared/utils/toTemplate";
import { useViewStore } from "@shared/store/useViewStore";
import LaunchTemplateRailButton from "@/components/windows/shared/LaunchTemplateRailButton";
import LaunchTimerRailButton from "../../../timer/LaunchTimerRailButton";
import { useCloseAllModals } from "../../../dialogs/modalBus";
import ProjectStatsTab from "./tabs/ProjectStatsTab";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  modes: Mode[];
  goals: Goal[];
  projects: Project[];
  milestones: Milestone[];
  tasks: Task[];
  defaultTab?: "edit" | "structure" | "comments";
};

export default function ProjectWindow({
  isOpen,
  onClose,
  project,
  modes,
  goals,
  tasks,
  projects,
  milestones,
}: Props) {
  useCloseAllModals(onClose);

  const [title, setTitle] = useState(project.title);
  const [modeId, setModeId] = useState(project.modeId);
  const [goalId, setGoalId] = useState<number | null | undefined>(
    project.goalId ?? null
  );
  const [parentId, setParentId] = useState<number | null | undefined>(
    project.parentId ?? null
  );
  const [dueDate, setDueDate] = useState(project.dueDate ?? "");
  const [dueTime, setDueTime] = useState(project.dueTime ?? "");
  const [assignedToId, setAssignedToId] = useState<number | null>(project.assignedToId ?? null);
  const { mutate: updateProject } = useUpdateProject();
  const { mutate: deleteProject } = useDeleteProject();

  const selectedMode = modes.find((m) => m.id === modeId);
  const modeColor = selectedMode?.color ?? "#555";

  const { projectDialogTab, setProjectDialogTab } = useDialogStore();
  const clockType = useTimerUIStore((s) => s.clockType);

  const tabNameToIndex = {
    edit: 0,
    structure: 1,
    comments: 2,
    notes: 3,
    boards: 4,
    stats: 5,
  } as const;
  const indexToTabName = [
    "edit",
    "structure",
    "comments",
    "notes",
    "boards",
    "stats",
  ] as const;
  const activeIndex = tabNameToIndex[projectDialogTab];
  const handleTabChange = (index: number) =>
    setProjectDialogTab(indexToTabName[index]);

  useEffect(() => {
    if (isOpen) document.body.classList.add("modal-open");
    else document.body.classList.remove("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [isOpen]);

  useEffect(() => {
    setTitle(project.title);
    setModeId(project.modeId);
    setGoalId(project.goalId ?? null);
    setParentId(project.parentId ?? null);
    setDueDate(project.dueDate ?? "");
    setDueTime(project.dueTime ?? "");
    setAssignedToId(project.assignedToId ?? null);
  }, [
    project.id,
    project.title,
    project.modeId,
    project.goalId,
    project.parentId,
    project.dueDate,
    project.dueTime,
    project.assignedToId,
  ]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();

    updateProject(
      {
        id: project.id,
        title: title.trim(),
        modeId,
        // ✅ always send a concrete tri-state value
        goalId: goalId ?? null, // number -> number, undefined -> null, null -> null
        parentId: parentId ?? null, // same logic
        // ✅ send explicit nulls when empty so buildPatch keeps/clears them properly
        dueDate: dueDate || null,
        dueTime: dueTime || null,
        assignedToId,
      },
      { onSuccess: onClose }
    );
  };

  const handleDelete = () => {
    deleteProject(project.id, { onSuccess: onClose });
  };

  const openWorkbench = useTemplateWorkbenchStore((s) => s.openWithDraft);
  const setViewType = useViewStore((s) => s.setViewType);
  const handleLaunchAsTemplate = () => {
    const data = projectToTemplateData(project, projects, milestones, tasks);
    openWorkbench({ type: "project", modeId: modeId, data });
    setViewType("templates");
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/20 z-40" />
        <Dialog.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          onEscapeKeyDown={onClose}
          onPointerDownOutside={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest("[data-batch-ui='true']")) {
              e.preventDefault();
              return;
            }
            onClose();
          }}
          onInteractOutside={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest("[data-batch-ui='true']")) e.preventDefault();
          }}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50"
          style={{ overflow: "visible" }}
        >
          <div className="relative bg-white rounded-xl w-[calc(100vw-2rem)] max-w-[900px] max-h-[90vh] h-[85vh] md:h-[90vh] flex flex-col overflow-hidden shadow-xl">
            <Dialog.Title className="sr-only">Edit Project</Dialog.Title>

            <EntityWindowShell
              modeColor={modeColor}
              activeIndex={activeIndex}
              onTabChange={handleTabChange}
              railFooter={
                <div className="flex flex-col items-start gap-2">
                  <LaunchTimerRailButton
                    title={`Launch in ${
                      clockType === "timer" ? "Timer" : "Stopwatch"
                    }`}
                    modeColor={modeColor}
                    entity={{ kind: "project", id: project.id }}
                    modes={modes}
                    goals={goals}
                    projects={projects}
                    milestones={milestones}
                    tasks={tasks}
                    setClockTypeOnLaunch={clockType}
                    onAfterLaunch={onClose}
                  />
                  <LaunchTemplateRailButton
                    onClick={handleLaunchAsTemplate}
                    modeColor={modeColor}
                    title="Launch as Template"
                  />
                </div>
              }
            >
              <Tab name="Edit" icon={<Pencil className="w-6 h-6" />}>
                <div className="h-full overflow-y-auto p-6">
                  <EditProjectForm
                    key={project.id}
                    title={title}
                    dueDate={dueDate}
                    dueTime={dueTime}
                    setTitle={setTitle}
                    modeId={modeId}
                    setModeId={setModeId}
                    goalId={goalId}
                    setGoalId={setGoalId}
                    parentId={parentId}
                    setParentId={setParentId}
                    setDueDate={setDueDate}
                    setDueTime={setDueTime}
                    assignedToId={assignedToId}
                    setAssignedToId={setAssignedToId}
                    handleSubmit={handleSubmit}
                    onCancel={onClose}
                    onDelete={handleDelete}
                    projectId={project.id}
                    modes={modes}
                    goals={goals}
                    projects={projects}
                  />
                </div>
              </Tab>

              <Tab name="Structure" icon={<Puzzle className="w-6 h-6" />}>
                <ProjectStructureTab
                  project={project}
                  mode={selectedMode}
                  milestones={milestones}
                  projects={projects}
                  tasks={tasks}
                />
              </Tab>

              <Tab name="Comments" icon={<MessageCircle className="w-6 h-6" />}>
                <ProjectCommentsTab project={project} modeColor={modeColor} />
              </Tab>

              <Tab name="Notes" icon={<NotebookPen className="w-6 h-6" />}>
                <ProjectNotesTab project={project} modeColor={modeColor} />
              </Tab>

              <Tab name="Boards" icon={<LayoutGrid className="w-6 h-6" />}>
                <div className="h-full overflow-y-auto">
                  <EntityBoardsTab
                    entity="project"
                    entityId={project.id}
                    modeId={modeId}
                    modeColor={modeColor}
                  />
                </div>
              </Tab>
              <Tab name="Stats" icon={<BarChart3 className="w-6 h-6" />}>
                <ProjectStatsTab
                  project={project}
                  modes={modes}
                  modeColor={modeColor}
                />
              </Tab>
            </EntityWindowShell>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
