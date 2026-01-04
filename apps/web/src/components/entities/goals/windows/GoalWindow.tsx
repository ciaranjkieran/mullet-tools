// components/entities/goals/windows/GoalWindow.tsx
"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import {
  Pencil,
  Puzzle,
  NotebookPen,
  LayoutGrid,
  MessageCircle,
  BarChart3,
} from "lucide-react";
import { useTimerUIStore } from "@/lib/store/useTimerUIStore";

import { Goal } from "@shared/types/Goal";
import { Mode } from "@shared/types/Mode";
import { Project } from "@shared/types/Project";
import { Milestone } from "@shared/types/Milestone";
import { Task } from "@shared/types/Task";

import GoalNotesTab from "./tabs/GoalNotesTab";
import EntityBoardsTab from "../../../windows/shared/EntityBoardsTab";
import { useUpdateGoal } from "@shared/api/hooks/goals/useUpdateGoal";
import { useDeleteGoal } from "@shared/api/hooks/goals/useDeleteGoal";
import { useCloseAllModals } from "../../../dialogs/modalBus";

import GoalCommentsTab from "./tabs/GoalCommentsTab";
import EntityWindowShell, {
  Tab,
} from "@/components/windows/shared/EntityWindowShell";
import EditGoalForm from "./edit/EditGoalForm";
import GoalStructureTab from "./tabs/GoalStructureTab";
import { useDialogStore } from "@/lib/dialogs/useDialogStore";

// NEW: circular timer launcher
import LaunchTimerRailButton from "../../../timer/LaunchTimerRailButton";
import GoalStatsTab from "./tabs/GoalStatsTab";
// If/when you add goal templates, you can import your template launcher here and place it below.

type Props = {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal;
  modes: Mode[];
  projects: Project[];
  milestones: Milestone[];
  tasks: Task[];
  defaultTab?: "edit" | "structure" | "comments" | "stats";
};

export default function GoalWindow({
  isOpen,
  onClose,
  goal,
  modes,
  projects,
  milestones,
  tasks,
  defaultTab,
}: Props) {
  const [title, setTitle] = useState(goal.title);
  const [modeId, setModeId] = useState(goal.modeId);
  const [dueDate, setDueDate] = useState(goal.dueDate ?? "");
  const [dueTime, setDueTime] = useState(goal.dueTime ?? "");
  const clockType = useTimerUIStore((s) => s.clockType);
  useCloseAllModals(onClose);

  const { mutate: updateGoal } = useUpdateGoal();
  const { mutate: deleteGoal } = useDeleteGoal();

  const selectedMode = modes.find((m) => m.id === modeId);
  const modeColor = selectedMode?.color ?? "#555";

  const { goalDialogTab, setGoalDialogTab } = useDialogStore();

  const tabNames = [
    "edit",
    "structure",
    "comments",
    "notes",
    "boards",
    "stats",
  ] as const;
  type GoalTab = (typeof tabNames)[number];

  const tabNameToIndex = Object.fromEntries(
    tabNames.map((name, i) => [name, i])
  ) as Record<GoalTab, number>;
  const indexToTabName = tabNames;

  const activeIndex = tabNameToIndex[goalDialogTab];
  const handleTabChange = (index: number) =>
    setGoalDialogTab(indexToTabName[index]);

  useEffect(() => {
    if (isOpen) document.body.classList.add("modal-open");
    else document.body.classList.remove("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [isOpen]);

  useEffect(() => {
    setTitle(goal.title);
    setModeId(goal.modeId);
    setDueDate(goal.dueDate ?? "");
    setDueTime(goal.dueTime ?? "");
  }, [goal]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    updateGoal(
      {
        id: goal.id,
        title: title.trim(),
        modeId,
        dueDate: dueDate || null,
        dueTime: dueTime || null,
      },
      { onSuccess: onClose }
    );
  };

  const handleDelete = () => {
    deleteGoal(goal.id, { onSuccess: onClose });
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
          <div className="relative bg-white rounded-xl w-[900px] max-h-[90vh] h-[90vh] flex flex-col overflow-hidden shadow-xl">
            <Dialog.Title className="sr-only">Edit Goal</Dialog.Title>

            <EntityWindowShell
              modeColor={modeColor}
              activeIndex={activeIndex}
              onTabChange={handleTabChange}
              railFooter={
                // Stack vertically so timer sits above (ready for a template button below if you add one)
                <div className="flex flex-col items-start gap-2">
                  <LaunchTimerRailButton
                    title={`Launch in ${
                      clockType === "timer" ? "Timer" : "Stopwatch"
                    }`}
                    modeColor={modeColor}
                    entity={{ kind: "goal", id: goal.id }}
                    modes={modes}
                    goals={[goal]} // ✅ provide the goal so modeId can be derived
                    projects={projects}
                    milestones={milestones}
                    tasks={tasks}
                    setClockTypeOnLaunch={clockType} // ← use the current clock selection
                    onAfterLaunch={onClose}
                  />

                  {/* If you later add a Goal template launcher, put it here so it sits below the timer button. */}
                </div>
              }
            >
              <Tab name="Edit" icon={<Pencil className="w-6 h-6" />}>
                <div className="h-full overflow-y-auto p-6">
                  <EditGoalForm
                    title={title}
                    dueDate={dueDate}
                    dueTime={dueTime}
                    setTitle={setTitle}
                    setDueDate={setDueDate}
                    setDueTime={setDueTime}
                    modeId={modeId}
                    setModeId={setModeId}
                    onSubmit={handleSubmit}
                    onCancel={onClose}
                    onDelete={handleDelete}
                    modes={modes}
                  />
                </div>
              </Tab>

              <Tab name="Structure" icon={<Puzzle className="w-6 h-6" />}>
                <GoalStructureTab
                  goal={goal}
                  mode={selectedMode!}
                  projects={projects}
                  milestones={milestones}
                  tasks={tasks}
                />
              </Tab>

              <Tab name="Comments" icon={<MessageCircle className="w-6 h-6" />}>
                <GoalCommentsTab goal={goal} modeColor={modeColor} />
              </Tab>

              <Tab name="Notes" icon={<NotebookPen className="w-6 h-6" />}>
                <GoalNotesTab goal={goal} modeColor={modeColor} />
              </Tab>

              <Tab name="Boards" icon={<LayoutGrid className="w-6 h-6" />}>
                <div className="h-full overflow-y-auto">
                  <EntityBoardsTab
                    entity="goal"
                    entityId={goal.id}
                    modeId={modeId}
                    modeColor={modeColor}
                  />
                </div>
              </Tab>
              <Tab name="Stats" icon={<BarChart3 className="w-6 h-6" />}>
                <GoalStatsTab goal={goal} modes={modes} modeColor={modeColor} />
              </Tab>
            </EntityWindowShell>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
