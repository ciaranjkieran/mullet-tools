"use client";

import { useState, useEffect } from "react";
import { useCreateTask } from "@shared/api/hooks/tasks/useCreateTask";
import { Task } from "@shared/types/Task";
import { getContrastingText } from "@shared/utils/getContrastingText";
import CustomDateInput from "@/lib/utils/CustomDateInput";
import { useTaskStore } from "@shared/store/useTaskStore";

type Mode = {
  id: number;
  title: string;
  color: string;
};

type Props = {
  inlineMode: Mode | "All";
  modes: Mode[];
  variant?: "dashboard" | "calendar";
  onCancel?: () => void;
  onAfterCreate?: () => void;
  initialDueDate?: string;
  milestoneId?: number | null;
  projectId?: number | null;
  goalId?: number | null;
  showToggleButton?: boolean; // ⬅️ new
};

export default function AddTaskInline({
  inlineMode,
  modes,
  variant = "dashboard",
  onCancel,
  onAfterCreate,
  initialDueDate,
  milestoneId,
  projectId,
  goalId,
  showToggleButton = true,
}: Props) {
  const [isComposing, setIsComposing] = useState(!showToggleButton);
  const [title, setTitle] = useState("");
  const [modeId, setModeId] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  // inside component
  const isUnderEntity = inlineMode !== "All";
  const displayModeTitle = inlineMode === "All" ? "All" : inlineMode.title;

  const { mutate: createTask } = useCreateTask();

  useEffect(() => {
    const resolved =
      inlineMode === "All" ? modes[0]?.id ?? null : inlineMode?.id ?? null;

    setModeId(resolved);

    if (initialDueDate) setDueDate(initialDueDate);
  }, [inlineMode, modes, initialDueDate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (showToggleButton) setIsComposing(false);
        onCancel?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, showToggleButton]);

  const mode = modes.find((m) => m.id === modeId);
  const modeColor = mode?.color || "#000";
  const textColor = getContrastingText(modeColor);

  const handleSubmit = () => {
    if (!title.trim() || !modeId) return;
    const isValidTime = (str: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(str);
    if (dueTime && !isValidTime(dueTime)) {
      alert("Please enter a valid time in HH:MM format (24h clock).");
      return;
    }

    const { tasks } = useTaskStore.getState();
    const relevantTasks = tasks.filter(
      (t) =>
        t.modeId === modeId &&
        (!t.dueDate || t.dueDate === (dueDate?.trim() || null))
    );
    const maxPosition = Math.max(
      0,
      ...relevantTasks.map((t) => t.position ?? 0)
    );
    const newPosition = maxPosition + 1;

    createTask(
      {
        title: title.trim(),
        modeId,
        dueDate: dueDate?.trim() || null,
        dueTime: dueTime?.trim() || null,
        milestoneId,
        projectId,
        goalId,
      },
      {
        onSuccess: () => {
          setTitle("");
          setDueDate(initialDueDate || ""); // <-- respect initialDueDate again
          setDueTime("");
          onAfterCreate?.();
          if (showToggleButton) setIsComposing(false);
        },
      }
    );
  };

  if (!isComposing) {
    const displayColor = inlineMode === "All" ? "#000000" : modeColor;
    return (
      <div className="mt-2">
        <div className="flex justify-end mt-4">
          <button
            onClick={() => setIsComposing(true)}
            className="text-md font-medium hover:underline cursor-pointer"
            style={{ color: "black" }}
            aria-label={`Add task${
              isUnderEntity ? ` to ${displayModeTitle}` : ""
            }`}
          >
            + Add Task
          </button>
        </div>
      </div>
    );
  }

  const containerClass =
    variant === "calendar"
      ? "mt-2 border border-gray-200 rounded-md p-3 space-y-3 bg-white"
      : "mt-4 border rounded p-4 space-y-3 bg-gray-50";

  return (
    <div className={containerClass}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="space-y-3"
      >
        <input
          className="border p-2 rounded w-full text-sm"
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
        <div className="flex flex-wrap gap-3 items-end">
          {/* Mode Selector */}
          {inlineMode === "All" && (
            <select
              value={modeId ?? ""}
              onChange={(e) => setModeId(Number(e.target.value))}
              className="border border-gray-300 rounded p-2 text-sm min-w-[120px]"
            >
              {modes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          )}

          {/* Due Date Input */}
          <div className="relative">
            <CustomDateInput value={dueDate} onChange={setDueDate} />
            {!dueDate && (
              <div className="absolute right-0 mt-1">
                <button
                  type="button"
                  onClick={() =>
                    setDueDate(new Date().toLocaleDateString("en-CA"))
                  }
                  className="text-sm text-blue-700 hover:underline cursor-pointer whitespace-nowrap"
                >
                  Set to today →
                </button>
              </div>
            )}
          </div>

          {/* Time Input */}
          <input
            type="text"
            className="border p-2 rounded text-sm min-w-[120px]"
            placeholder="HH:MM (24h)"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2">
          {showToggleButton && (
            <button
              type="button"
              onClick={() => setIsComposing(false)}
              className="text-sm text-gray-500 cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="text-white text-sm font-semibold px-4 py-2 rounded cursor-pointer"
            style={{ backgroundColor: modeColor, color: textColor }}
          >
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
