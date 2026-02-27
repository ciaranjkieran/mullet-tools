"use client";

import { useState, useEffect } from "react";
import { Mode } from "@shared/types/Mode";
import { TargetIcon } from "lucide-react";

import TitleInput from "@/components/inputs/TitleInput";
import ConfirmDialog from "@/lib/utils/ConfirmDialog";
import { getContrastingText } from "@shared/utils/getContrastingText";
import DueDateInput from "@/components/inputs/DueDateInput";
import DueTimeInput from "@/components/inputs/DueTimeInput";
import EditorModeSelect from "@/components/inputs/editor/EditorModeSelect";
import EditorAssigneeSelect from "@/components/inputs/editor/EditorAssigneeSelect";

import {
  parseISO,
  isBefore,
  isAfter,
  isEqual,
  startOfToday,
  addDays,
} from "date-fns";

type Props = {
  title: string;
  modeId: number;
  dueDate: string;
  dueTime: string;
  assignedToId: number | null;

  setTitle: (val: string) => void;
  setModeId: (id: number) => void;
  setDueDate: (val: string) => void;
  setDueTime: (val: string) => void;
  setAssignedToId: (id: number | null) => void;

  onSubmit: (e?: React.FormEvent) => void;
  onCancel: () => void;
  onDelete: () => void;

  modes: Mode[];
};

export default function EditGoalForm({
  title,
  dueDate,
  dueTime,
  assignedToId,
  setTitle,
  setDueDate,
  setDueTime,
  setAssignedToId,
  modeId,
  setModeId,
  onSubmit,
  onCancel,
  onDelete,
  modes,
}: Props) {
  const selectedMode = modes.find((m) => m.id === modeId);
  const modeColor = selectedMode?.color || "#333";
  const textColor = getContrastingText(modeColor);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const today = startOfToday();
  const nextMonday = (() => {
    const day = today.getDay();
    const daysUntilNextMonday = (8 - day) % 7 || 7;
    return addDays(today, daysUntilNextMonday);
  })();

  useEffect(() => {
    if (!dueDate && dueTime) {
      setDueTime("");
    }
  }, [dueDate, dueTime, setDueTime]);

  let shouldShowPostpone = false;
  if (dueDate) {
    const d = parseISO(dueDate);
    const isOverdue = isBefore(d, today);
    const onOrAfterToday = isEqual(d, today) || isAfter(d, today);
    const beforeNextMonday = isBefore(d, nextMonday);
    shouldShowPostpone = !isOverdue && onOrAfterToday && beforeNextMonday;
  }

  return (
    <>
      <div
        className="absolute top-0 left-0 w-full h-1.5 md:h-4 rounded-t-xl"
        style={{ backgroundColor: modeColor, opacity: 0.3 }}
      />
      <form
        onSubmit={onSubmit}
        className="space-y-6 text-sm text-gray-900"
        onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
      >
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{ backgroundColor: modeColor }}
          >
            <TargetIcon className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <TitleInput title={title} setTitle={setTitle} label="Goal" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
          <div className="flex flex-col gap-6">
            <DueDateInput
              dueDate={dueDate}
              setDueDate={setDueDate}
              showPostpone={shouldShowPostpone}
            />
            <DueTimeInput dueTime={dueTime} setDueTime={setDueTime} />
          </div>

          <div className="flex flex-col gap-4">
            <EditorModeSelect
              modes={modes}
              modeId={modeId}
              onChange={setModeId}
              variant="edit"
              modeColor={modeColor}
            />
            <EditorAssigneeSelect
              modeId={modeId}
              assignedToId={assignedToId}
              onChange={setAssignedToId}
            />
          </div>
        </div>

        <div className="flex justify-between items-center pt-6">
          {!confirmOpen ? (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="text-sm text-red-500 hover:underline font-semibold"
            >
              Delete Goal
            </button>
          ) : (
            <ConfirmDialog
              open={confirmOpen}
              onClose={() => setConfirmOpen(false)}
              onConfirm={() => {
                onDelete();
                setConfirmOpen(false);
              }}
              title={`Delete goal "${title}"?`}
              description="This action cannot be undone."
              confirmText="Delete"
              cancelText="Cancel"
            />
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm rounded-md bg-gray-200 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold rounded-md"
              style={{ backgroundColor: modeColor, color: textColor }}
            >
              Save
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
