"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState, useEffect } from "react";
import { Mode } from "@shared/types/Mode";
import { Goal } from "@shared/types/Goal";
import { Project } from "@shared/types/Project";
import { useCreateGoal } from "@shared/api/hooks/goals/useCreateGoal";
import BuildGoalForm from "./BuildGoalForm";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  defaultModeId: number | null;
  modes: Mode[];
};

export default function BuildGoalWindow({
  isOpen,
  onClose,
  defaultModeId,
  modes,
}: Props) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [modeId, setModeId] = useState<number | null>(defaultModeId);

  const { mutate: createGoal } = useCreateGoal();

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

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title || !modeId) return;

    createGoal(
      {
        title: title.trim(),
        modeId,
        dueDate: dueDate || undefined,
        dueTime: dueTime || undefined,
      },
      { onSuccess: onClose }
    );
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl z-50 w-full max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          <BuildGoalForm
            title={title}
            dueDate={dueDate}
            dueTime={dueTime}
            modeId={modeId}
            setTitle={setTitle}
            setDueDate={setDueDate}
            setDueTime={setDueTime}
            setModeId={setModeId}
            handleSubmit={handleSubmit}
            modes={modes}
            onCancel={onClose}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
