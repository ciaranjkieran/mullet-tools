"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState, useEffect } from "react";
import { useCreateMilestone } from "@shared/api/hooks/milestones/useCreateMilestone";
import { Mode } from "@shared/types/Mode";
import { Goal } from "@shared/types/Goal";
import { Project } from "@shared/types/Project";
import { Milestone } from "@shared/types/Milestone";

import BuildMilestoneForm from "./BuildMilestoneForm";
import { buildMilestonePayload } from "@shared/lineage/xor";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  defaultModeId: number | null;
  modes: Mode[];
  goals: Goal[];
  projects: Project[];
  milestones: Milestone[];
};

export default function BuildMilestoneWindow({
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
  const [goalId, setGoalId] = useState<number | null | undefined>();
  const [projectId, setProjectId] = useState<number | null | undefined>();
  const [parentId, setParentId] = useState<number | null | undefined>();

  const { mutate: createMilestone } = useCreateMilestone();

  useEffect(() => {
    if (isOpen && defaultModeId !== null) setModeId(defaultModeId);
  }, [isOpen, defaultModeId]);

  useEffect(() => {
    if (isOpen) document.body.classList.add("modal-open");
    else document.body.classList.remove("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [isOpen]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title || !modeId) return;

    const normalized = buildMilestonePayload({
      title: title.trim(),
      dueDate: dueDate || null,
      dueTime: dueTime || null,
      modeId,
      parentId: parentId ?? null,
      projectId: projectId ?? null,
      goalId: goalId ?? null,
    });

    createMilestone(normalized, { onSuccess: onClose });
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl z-50 w-full max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          <BuildMilestoneForm
            title={title}
            dueDate={dueDate}
            dueTime={dueTime}
            modeId={modeId}
            goalId={goalId}
            projectId={projectId}
            parentId={parentId}
            setTitle={setTitle}
            setDueDate={setDueDate}
            setDueTime={setDueTime}
            setModeId={setModeId}
            setGoalId={setGoalId}
            setProjectId={setProjectId}
            setParentId={setParentId}
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
