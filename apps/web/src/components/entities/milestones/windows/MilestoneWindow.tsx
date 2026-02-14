// components/entities/milestones/windows/MilestoneWindow.tsx
"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import {
  Pencil,
  Puzzle,
  MessageCircle,
  NotebookPen,
  LayoutGrid,
  BarChart3,
} from "lucide-react";

import MilestoneCommentsTab from "./tabs/MilestoneCommentsTab";
import MilestoneNotesTab from "./tabs/MilestoneNotesTab";
import EntityBoardsTab from "../../../windows/shared/EntityBoardsTab";
import { useUpdateMilestone } from "@shared/api/hooks/milestones/useUpdateMilestone";
import { useDeleteMilestone } from "@shared/api/hooks/milestones/useDeleteMilestone";
import LaunchTimerRailButton from "../../../timer/LaunchTimerRailButton";
import { useTimerUIStore } from "@/lib/store/useTimerUIStore";

import { Mode } from "@shared/types/Mode";
import { Goal } from "@shared/types/Goal";
import { Project } from "@shared/types/Project";
import { Milestone } from "@shared/types/Milestone";
import { Task } from "@shared/types/Task";
import { useDialogStore } from "@/lib/dialogs/useDialogStore";
import { useCloseAllModals } from "../../../dialogs/modalBus";
import MilestoneStatsTab from "./tabs/MilestoneStatsTab";

import EntityWindowShell, {
  Tab,
} from "@/components/windows/shared/EntityWindowShell";
import EditMilestoneForm from "./edit/EditMilestoneForm";
import MilestoneStructureTab from "./tabs/MilestoneStructureTab";

// NEW:
import { useTemplateWorkbenchStore } from "@shared/store/useTemplateWorkbenchStore";
import { milestoneToTemplateData } from "@shared/utils/toTemplate";
import { useViewStore } from "@shared/store/useViewStore";
import LaunchTemplateRailButton from "@/components/windows/shared/LaunchTemplateRailButton";

type Props = {
  milestone: Milestone;
  isOpen: boolean;
  onClose: () => void;
  modes: Mode[];
  goals: Goal[];
  projects: Project[];
  milestones: Milestone[];
  tasks: Task[];
  defaultModeId: number;
  defaultTab?: "edit" | "structure" | "comments" | "notes" | "stats";
};

export default function MilestoneWindow({
  milestone,
  isOpen,
  onClose,
  modes,
  goals,
  projects,
  milestones,
  tasks,
}: Props) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [modeId, setModeId] = useState(milestone.modeId);
  const [projectId, setProjectId] = useState<number | undefined | null>(null);
  const [goalId, setGoalId] = useState<number | undefined | null>(null);
  const [parentId, setParentId] = useState<number | undefined | null>(null);
  const clockType = useTimerUIStore((s) => s.clockType);
  useCloseAllModals(onClose);

  const { mutate: updateMilestone } = useUpdateMilestone();
  const { mutate: deleteMilestone } = useDeleteMilestone();

  const selectedMode = modes.find((m) => m.id === modeId);
  const modeColor = selectedMode?.color ?? "#555";
  const { milestoneDialogTab, setMilestoneDialogTab } = useDialogStore();

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
  const activeIndex = tabNameToIndex[milestoneDialogTab];
  const handleTabChange = (index: number) =>
    setMilestoneDialogTab(indexToTabName[index]);

  useEffect(() => {
    if (isOpen) document.body.classList.add("modal-open");
    else document.body.classList.remove("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [isOpen]);

  useEffect(() => {
    setTitle(milestone.title);
    setModeId(milestone.modeId);
    setProjectId(milestone.projectId ?? null);
    setParentId(milestone.parentId ?? null);
    setGoalId(milestone.goalId ?? null);
    setDueDate(milestone.dueDate ?? "");
    setDueTime(milestone.dueTime ?? "");
  }, [milestone]);

  function normalizeAncestors(
    parentIdIn: number | null | undefined,
    projectIdIn: number | null | undefined,
    goalIdIn: number | null | undefined
  ) {
    const p = parentIdIn ?? null;
    const pr = projectIdIn ?? null;
    const g = goalIdIn ?? null;
    if (p !== null) return { parentId: p, projectId: null, goalId: null };
    if (pr !== null) return { parentId: null, projectId: pr, goalId: null };
    if (g !== null) return { parentId: null, projectId: null, goalId: g };
    return { parentId: null, projectId: null, goalId: null };
  }

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title || !modeId) return;

    const {
      parentId: nParent,
      projectId: nProject,
      goalId: nGoal,
    } = normalizeAncestors(parentId, projectId, goalId);

    updateMilestone(
      {
        id: milestone.id,
        title: title.trim(),
        modeId,
        dueDate: dueDate || undefined,
        dueTime: dueTime || undefined,
        parentId: nParent,
        projectId: nProject,
        goalId: nGoal,
      },
      { onSuccess: onClose }
    );
  };

  const handleDelete = () => {
    deleteMilestone(milestone.id, { onSuccess: onClose });
  };

  // NEW: Launch as Template
  const openWorkbench = useTemplateWorkbenchStore((s) => s.openWithDraft);
  const setViewType = useViewStore((s) => s.setViewType);
  const handleLaunchAsTemplate = () => {
    const data = milestoneToTemplateData(milestone, milestones, tasks);

    const resolvedModeId =
      modeId ?? selectedMode?.id ?? milestone.modeId ?? null;

    if (resolvedModeId == null) return;

    openWorkbench({ type: "milestone", modeId: resolvedModeId, data });
    setViewType("templates");
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40" />
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
            <Dialog.Title className="sr-only">Milestone Window</Dialog.Title>

            <EntityWindowShell
              modeColor={modeColor}
              activeIndex={activeIndex}
              onTabChange={handleTabChange}
              railFooter={
                // ⬇️ vertical rail, timer ABOVE template
                <div className="flex flex-col items-center gap-3">
                  <LaunchTimerRailButton
                    title={`Launch in ${
                      clockType === "timer" ? "Timer" : "Stopwatch"
                    }`}
                    modeColor={modeColor}
                    entity={{ kind: "milestone", id: milestone.id }}
                    modes={modes}
                    goals={goals}
                    projects={projects}
                    milestones={milestones}
                    tasks={tasks}
                    setClockTypeOnLaunch={clockType} // ← use the current clock selection
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
                  <EditMilestoneForm
                    milestone={milestone}
                    title={title}
                    dueDate={dueDate}
                    dueTime={dueTime}
                    modeId={modeId}
                    parentId={parentId}
                    projectId={projectId}
                    goalId={goalId}
                    setTitle={setTitle}
                    setDueDate={setDueDate}
                    setDueTime={setDueTime}
                    setModeId={setModeId}
                    setParentId={setParentId}
                    setProjectId={setProjectId}
                    setGoalId={setGoalId}
                    handleSubmit={handleSubmit}
                    onCancel={onClose}
                    onDelete={handleDelete}
                    modes={modes}
                    goals={goals}
                    projects={projects}
                    milestones={milestones}
                  />
                </div>
              </Tab>

              <Tab name="Structure" icon={<Puzzle className="w-6 h-6" />}>
                <MilestoneStructureTab
                  milestones={milestones}
                  milestone={milestone}
                  tasks={tasks}
                  mode={selectedMode!}
                  goals={goals}
                  projects={projects}
                />
              </Tab>

              <Tab name="Comments" icon={<MessageCircle className="w-6 h-6" />}>
                <MilestoneCommentsTab
                  milestone={milestone}
                  modeColor={modeColor}
                />
              </Tab>

              <Tab name="Notes" icon={<NotebookPen className="w-6 h-6" />}>
                <MilestoneNotesTab
                  milestone={milestone}
                  modeColor={modeColor}
                />
              </Tab>

              <Tab name="Boards" icon={<LayoutGrid className="w-6 h-6" />}>
                <div className="h-full overflow-y-auto">
                  <EntityBoardsTab
                    entity="milestone"
                    entityId={milestone.id}
                    modeId={modeId}
                    modeColor={modeColor}
                  />
                </div>
              </Tab>
              <Tab name="Stats" icon={<BarChart3 className="w-6 h-6" />}>
                <MilestoneStatsTab
                  milestone={milestone}
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
