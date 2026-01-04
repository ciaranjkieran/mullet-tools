"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState, useEffect } from "react";
import { useModeStore } from "@shared/store/useModeStore";
import { useTaskStore } from "@shared/store/useTaskStore";

import { useCreateMilestone } from "@shared/api/hooks/milestones/useCreateMilestone";
import { useUpdateTask } from "@shared/api/hooks/tasks/useUpdateTask";

import { Milestone } from "@shared/types/Milestone";


interface GroupUnderMilestoneDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  modeId?: number | null;
  milestones: Milestone[];
}

export function GroupUnderMilestoneDialog({
  open,
  setOpen,
  modeId,
  milestones,
}: GroupUnderMilestoneDialogProps) {
  const [title, setTitle] = useState("");
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<number | null>(
    null
  );

  const { mutate: createMilestone, isPending } = useCreateMilestone();
  const { mutate: updateTaskMutation } = useUpdateTask();

  const selectedTaskIds = useTaskStore((s) => s.selectedTaskIds);
  const allTasks = useTaskStore((s) => s.tasks);
  const updateTask = useTaskStore((s) => s.updateTask);
  const clearSelectedTasks = useTaskStore((s) => s.clearSelectedTasks);

  const modes = useModeStore((s) => s.modes);

  const firstTask = allTasks.find((t) => t.id === selectedTaskIds[0]);
  const fallbackModeId = modeId ?? firstTask?.modeId;
  const modeMilestones = milestones.filter((m) => m.modeId === fallbackModeId);

  const handleSubmit = () => {
    const firstTask = allTasks.find((t) => t.id === selectedTaskIds[0]);
    if (!firstTask) return;

    if (selectedMilestoneId === -1) {
      selectedTaskIds.forEach((taskId) => {
        const task = allTasks.find((t) => t.id === taskId);
        if (task) {
          updateTaskMutation({ ...task, milestoneId: null });
          updateTask({ ...task, milestoneId: null });
        }
      });

      clearSelectedTasks();
      setSelectedMilestoneId(null);
      setOpen(false);
    } else if (selectedMilestoneId !== null) {
      selectedTaskIds.forEach((taskId) => {
        const task = allTasks.find((t) => t.id === taskId);
        if (task) {
          updateTaskMutation({ ...task, milestoneId: selectedMilestoneId });
          updateTask({ ...task, milestoneId: selectedMilestoneId });
        }
      });

      clearSelectedTasks();
      setSelectedMilestoneId(null);
      setOpen(false);
    } else if (title.trim()) {
      createMilestone(
        {
          title: title.trim(),
          modeId: firstTask.modeId,
        },
        {
          onSuccess: (newMilestone) => {
            selectedTaskIds.forEach((taskId) => {
              const task = allTasks.find((t) => t.id === taskId);
              if (task) {
                updateTaskMutation({ ...task, milestoneId: newMilestone.id });
                updateTask({ ...task, milestoneId: newMilestone.id });
              }
            });

            clearSelectedTasks();
            setTitle("");
            setOpen(false);
          },
        }
      );
    }
  };

  useEffect(() => {
    if (open) document.body.classList.add("modal-open");
    else document.body.classList.remove("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [open]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (isOpen !== open) setOpen(isOpen);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" />
        <Dialog.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
             bg-neutral-100 border border-gray-300 p-6 md:p-8 rounded-xl shadow-xl 
             w-full max-w-md max-h-[90vh] overflow-y-auto z-50"
        >
          <Dialog.Title className="text-xl font-bold mb-4 text-gray-900">
            Group selected tasks under a milestone
          </Dialog.Title>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            {modeMilestones.length > 0 && (
              <div className="space-y-2 mb-4">
                <p className="text-sm font-medium text-gray-900">
                  Choose an existing milestone:
                </p>
                {modeMilestones.map((milestone) => {
                  const mode = modes.find((m) => m.id === milestone.modeId);
                  const modeColor = mode?.color ?? "#999";
                  return (
                    <button
                      key={milestone.id}
                      type="button"
                      onClick={() => setSelectedMilestoneId(milestone.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition cursor-pointer ${
                        selectedMilestoneId === milestone.id
                          ? "bg-gray-200 border-gray-500"
                          : "border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      <div
                        className="triangle"
                        style={{ borderTopColor: modeColor }}
                      />
                      <span className="text-gray-900">{milestone.title}</span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setSelectedMilestoneId(-1)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition cursor-pointer ${
                    selectedMilestoneId === -1
                      ? "bg-gray-200 border-gray-500"
                      : "border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  <span className="text-gray-900">None</span>
                </button>
              </div>
            )}

            <input
              placeholder="Or click here to enter a new milestone title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setSelectedMilestoneId(null);
              }}
              disabled={isPending}
              className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-gray-800 placeholder-gray-700"
            />

            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="px-4 py-2 text-sm rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800 cursor-pointer"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={
                  (!title.trim() && selectedMilestoneId === null) || isPending
                }
                className="px-5 py-2 text-sm font-semibold rounded-md cursor-pointer bg-black text-white hover:bg-gray-800"
              >
                {isPending ? "Grouping..." : "Group Tasks"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
