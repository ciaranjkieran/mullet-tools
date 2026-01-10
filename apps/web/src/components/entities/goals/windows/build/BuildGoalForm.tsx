"use client";

import { Mode } from "@shared/types/Mode";
import TitleInput from "@/components/inputs/TitleInput";
import ModeInput from "@/components/timer/inputs/TimerModeSelect";
import DueDateInput from "@/components/inputs/DueDateInput";
import DueTimeInput from "@/components/inputs/DueTimeInput";
import { TargetIcon } from "lucide-react";

import { getContrastingText } from "@shared/utils/getContrastingText";

type Props = {
  title: string;
  dueDate: string;
  dueTime: string;
  modeId: number | null;

  setTitle: (val: string) => void;
  setDueDate: (val: string) => void;
  setDueTime: (val: string) => void;
  setModeId: (id: number) => void;

  handleSubmit: (e?: React.FormEvent) => void;
  onCancel: () => void;

  modes: Mode[];
};

export default function BuildGoalForm({
  title,
  dueDate,
  dueTime,
  modeId,
  setTitle,
  setDueDate,
  setDueTime,
  handleSubmit,
  modes,
}: Props) {
  const selectedMode = modes.find((m) => m.id === modeId);
  const modeColor = selectedMode?.color || "#333";
  const textColor = getContrastingText(modeColor);

  return (
    <form
      onSubmit={handleSubmit}
      className="relative px-6 py-6 pt-8 md:px-10 md:py-10 text-sm text-gray-900"
    >
      <div
        className="absolute top-0 left-0 w-full h-1.5 md:h-4 rounded-t-xl"
        style={{ backgroundColor: modeColor, opacity: 0.3 }}
      />
      <div
        className="absolute top-0 left-0 h-full w-1.5 md:w-2 rounded-l-xl"
        style={{ backgroundColor: modeColor, opacity: 0.5 }}
      />

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
        {/* LEFT */}
        <div className="flex flex-col gap-6">
          <DueDateInput
            dueDate={dueDate}
            setDueDate={setDueDate}
            showPostpone={false}
          />
          <DueTimeInput dueTime={dueTime} setDueTime={setDueTime} />
        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-6">
          <ModeInput modeId={modeId} modes={modes} modeColor={modeColor} />
        </div>
      </div>

      <div className="flex justify-end items-center pt-6">
        <button
          type="submit"
          className="px-5 py-2 text-sm font-semibold rounded-md"
          style={{ backgroundColor: modeColor, color: textColor }}
        >
          Create Goal
        </button>
      </div>
    </form>
  );
}
