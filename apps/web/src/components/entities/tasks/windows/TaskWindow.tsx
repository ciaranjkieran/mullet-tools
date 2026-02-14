// components/entities/tasks/windows/TaskWindow.tsx
"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import { useUpdateTask } from "@shared/api/hooks/tasks/useUpdateTask";
import { useDeleteTask } from "@shared/api/hooks/tasks/useDeleteTask";
import TaskCommentsTab from "./tabs/TaskCommentsTab";
import { MessageCircle, Pencil, LayoutGrid, NotebookPen } from "lucide-react";
import { useDialogStore } from "@/lib/dialogs/useDialogStore";
import EntityBoardsTab from "../../../windows/shared/EntityBoardsTab";
import TaskNotesTab from "./tabs/TaskNotesTab";
import { Task } from "@shared/types/Task";
import { Mode } from "@shared/types/Mode";
import { Milestone } from "@shared/types/Milestone";
import { Project } from "@shared/types/Project";
import { Goal } from "@shared/types/Goal";
import { useTimerUIStore } from "@/lib/store/useTimerUIStore";
import { BarChart3 } from "lucide-react"; // or any icon you like
import TaskStatsTab from "./tabs/TaskStatsTab";

import EditTaskForm from "./edit/EditTaskForm";
import EntityWindowShell, {
  Tab,
} from "@/components/windows/shared/EntityWindowShell";
import LaunchTimerRailButton from "../../../timer/LaunchTimerRailButton";
import { useCloseAllModals } from "../../../dialogs/modalBus";

type Props = {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  modes: Mode[];
  goals: Goal[];
  projects: Project[];
  milestones: Milestone[];
  defaultModeId: number | null;
  defaultTab?: "edit" | "comments" | "notes" | "stats";
};

export default function TaskWindow({
  task,
  isOpen,
  onClose,
  modes,
  goals,
  projects,
  milestones,
}: Props) {
  useCloseAllModals(onClose);

  const [title, setTitle] = useState(task.title);
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [dueTime, setDueTime] = useState(task.dueTime ?? "");
  const [modeId, setModeId] = useState(task.modeId);
  const clockType = useTimerUIStore((s) => s.clockType);

  const [milestoneId, setMilestoneId] = useState<number | null | undefined>(
    task.milestoneId ?? null
  );
  const [projectId, setProjectId] = useState<number | null | undefined>(
    task.projectId ?? null
  );
  const [goalId, setGoalId] = useState<number | null | undefined>(
    task.goalId ?? null
  );

  const { taskDialogTab, setTaskDialogTab } = useDialogStore();
  const tabNames = ["edit", "comments", "notes", "boards", "stats"] as const;
  type TaskTab = (typeof tabNames)[number];
  const tabNameToIndex: Record<TaskTab, number> = {
    edit: 0,
    comments: 1,
    notes: 2,
    boards: 3,
    stats: 4,
  };
  const indexToTabName = tabNames;
  const activeIndex = tabNameToIndex[taskDialogTab as TaskTab];
  const handleTabChange = (index: number) =>
    setTaskDialogTab(indexToTabName[index]);

  const modeColor = modes.find((m) => m.id === modeId)?.color ?? "#555";

  const { mutate: updateTask } = useUpdateTask();
  const { mutate: deleteTask } = useDeleteTask();

  useEffect(() => {
    if (isOpen) document.body.classList.add("modal-open");
    else document.body.classList.remove("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [isOpen]);

  useEffect(() => {
    setTitle(task.title);
    setDueDate(task.dueDate ?? "");
    setDueTime(task.dueTime ?? "");
    setModeId(task.modeId);
    setMilestoneId(task.milestoneId ?? null);
    setProjectId(task.projectId ?? null);
    setGoalId(task.goalId ?? null);
  }, [task]);

  function normalizeTaskAncestors(
    mid: number | null | undefined,
    pid: number | null | undefined,
    gid: number | null | undefined
  ) {
    const m = mid ?? null;
    const p = pid ?? null;
    const g = gid ?? null;
    if (m !== null) return { milestoneId: m, projectId: null, goalId: null };
    if (p !== null) return { milestoneId: null, projectId: p, goalId: null };
    if (g !== null) return { milestoneId: null, projectId: null, goalId: g };
    return { milestoneId: null, projectId: null, goalId: null };
  }

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title || !modeId) return;
    const norm = normalizeTaskAncestors(milestoneId, projectId, goalId);
    updateTask(
      {
        id: task.id,
        title: title.trim(),
        modeId,
        dueDate: dueDate || undefined,
        dueTime: dueTime || undefined,
        ...norm,
      },
      { onSuccess: onClose }
    );
  };

  const handleDelete = () => {
    deleteTask(task.id, { onSuccess: onClose });
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-2rem)] max-w-[900px] max-h-[90vh] h-[85vh] md:h-[90vh] rounded-xl shadow-xl bg-white overflow-hidden"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <EntityWindowShell
            modeColor={modeColor}
            activeIndex={activeIndex}
            onTabChange={handleTabChange}
            railFooter={
              <div className="flex items-center gap-2">
                <LaunchTimerRailButton
                  title={`Launch in ${
                    clockType === "timer" ? "Timer" : "Stopwatch"
                  }`}
                  modeColor={modeColor}
                  entity={{ kind: "task", id: task.id }}
                  modes={modes}
                  goals={goals}
                  projects={projects}
                  milestones={milestones}
                  tasks={[task]}
                  setClockTypeOnLaunch={clockType}
                  onAfterLaunch={onClose}
                />
              </div>
            }
          >
            <Tab name="Edit" icon={<Pencil className="w-6 h-6" />}>
              <div className="h-full overflow-y-auto p-6">
                <EditTaskForm
                  key={task.id}
                  task={task}
                  title={title}
                  dueDate={dueDate}
                  dueTime={dueTime}
                  modeId={modeId}
                  milestoneId={milestoneId}
                  projectId={projectId}
                  goalId={goalId}
                  setTitle={setTitle}
                  setDueDate={setDueDate}
                  setDueTime={setDueTime}
                  setModeId={setModeId}
                  setMilestoneId={setMilestoneId}
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

            <Tab name="Comments" icon={<MessageCircle className="w-6 h-6" />}>
              <div className="h-full overflow-y-auto">
                <TaskCommentsTab task={task} modeColor={modeColor} />
              </div>
            </Tab>

            <Tab name="Notes" icon={<NotebookPen className="w-6 h-6" />}>
              <TaskNotesTab task={task} modes={modes} />
            </Tab>

            <Tab name="Boards" icon={<LayoutGrid className="w-6 h-6" />}>
              <div className="h-full overflow-y-auto">
                <EntityBoardsTab
                  entity="task"
                  entityId={task.id}
                  modeId={modeId}
                  modeColor={modeColor}
                />
              </div>
            </Tab>
            <Tab name="Stats" icon={<BarChart3 className="w-6 h-6" />}>
              <TaskStatsTab task={task} modes={modes} />
            </Tab>
          </EntityWindowShell>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
