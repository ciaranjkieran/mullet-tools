"use client";

import { useTaskStore } from "@shared/store/useTaskStore";

interface Props {
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  modeId?: number | null;
}

export function SelectionToolbar({ dialogOpen, setDialogOpen, modeId }: Props) {
  const selectedTaskIds = useTaskStore((s) => s.selectedTaskIds);
  const tasks = useTaskStore((s) => s.tasks);
  const clearSelectedTasks = useTaskStore((s) => s.clearSelectedTasks);

  const selectedTasks = tasks.filter((t) => selectedTaskIds.includes(t.id));
  const uniqueModeIds = new Set(selectedTasks.map((t) => t.modeId));
  const isSingleMode = uniqueModeIds.size === 1;

  if (selectedTaskIds.length === 0 || dialogOpen || !isSingleMode) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white border shadow-md rounded-md px-4 py-2 flex items-center gap-4">
      <span className="text-sm font-medium text-gray-800">
        {selectedTaskIds.length} task{selectedTaskIds.length > 1 ? "s" : ""}{" "}
        selected
      </span>

      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="px-4 py-2 text-sm font-semibold bg-black text-white rounded-md hover:bg-gray-800 cursor-pointer"
      >
        Group under milestone
      </button>

      <button
        type="button"
        onClick={clearSelectedTasks}
        className="px-4 py-2 text-sm font-medium text-gray-600 hover:underline cursor-pointer"
      >
        Cancel
      </button>
    </div>
  );
}
