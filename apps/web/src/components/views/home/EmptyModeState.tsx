"use client";

import { Target, FolderOpen, Plus } from "lucide-react";
import { useDialogStore } from "@/lib/dialogs/useDialogStore";
import type { Mode } from "@shared/types/Mode";

type Props = {
  mode: Mode | null;
  isAll: boolean;
};

export default function EmptyModeState({ mode, isAll }: Props) {
  const {
    setIsTaskDialogOpen,
    setTaskToEdit,
    setIsGoalDialogOpen,
    setGoalToEdit,
    setIsProjectDialogOpen,
    setProjectToEdit,
  } = useDialogStore();

  if (isAll) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Plus className="w-7 h-7 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">
          Nothing here yet
        </h3>
        <p className="mt-2 text-sm text-gray-500 max-w-sm">
          Select a Mode above and start adding tasks, goals, or projects. Everything you create will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h3 className="text-lg font-semibold text-gray-900">
        {mode?.title} is empty
      </h3>
      <p className="mt-2 text-sm text-gray-500 max-w-sm">
        Get started by adding something to this Mode.
      </p>

      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => {
            setTaskToEdit(null);
            setIsTaskDialogOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add a task
        </button>

        <button
          onClick={() => {
            setGoalToEdit(null);
            setIsGoalDialogOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition shadow-sm"
        >
          <Target className="w-4 h-4" />
          Set a goal
        </button>

        <button
          onClick={() => {
            setProjectToEdit(null);
            setIsProjectDialogOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition shadow-sm"
        >
          <FolderOpen className="w-4 h-4" />
          Start a project
        </button>
      </div>
    </div>
  );
}
