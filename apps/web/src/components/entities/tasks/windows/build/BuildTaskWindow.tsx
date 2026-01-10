// components/entities/tasks/windows/build/BuildTaskWindow.tsx
"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import { useCreateTask } from "@shared/api/hooks/tasks/useCreateTask";

import { Mode } from "@shared/types/Mode";
import { Goal } from "@shared/types/Goal";
import { Project } from "@shared/types/Project";
import { Milestone } from "@shared/types/Milestone";

import BuildTaskForm from "./BuildTaskForm";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  defaultModeId: number | null;
  modes: Mode[];
  goals: Goal[];
  projects: Project[];
  milestones: Milestone[];
};

export default function BuildTaskWindow({
  isOpen,
  onClose,
  defaultModeId,
  modes,
  goals,
  projects,
  milestones,
}: Props) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [modeId, setModeId] = useState<number | null>(defaultModeId);

  // Stored XOR IDs
  const [milestoneId, setMilestoneId] = useState<number | null | undefined>();
  const [projectId, setProjectId] = useState<number | null | undefined>();
  const [goalId, setGoalId] = useState<number | null | undefined>();

  const { mutate: createTask } = useCreateTask();

  useEffect(() => {
    if (isOpen && defaultModeId !== null) {
      setModeId(defaultModeId);
    }
  }, [isOpen, defaultModeId]);

  useEffect(() => {
    if (isOpen) document.body.classList.add("modal-open");
    else document.body.classList.remove("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [isOpen]);

  // Normalize to ONE ancestor for the API
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

    createTask(
      {
        title: title.trim(),
        modeId,
        dueDate: dueDate || undefined,
        dueTime: dueTime || undefined,
        ...norm,
      },
      { onSuccess: onClose }
    );
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl z-50 w-full max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          <BuildTaskForm
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
            modes={modes}
            goals={goals}
            projects={projects}
            milestones={milestones}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
