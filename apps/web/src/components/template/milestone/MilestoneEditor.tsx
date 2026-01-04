"use client";

import { Plus, Trash2 } from "lucide-react";
import { TemplateMilestoneData } from "@shared/types/Template";

import {
  addTask,
  removeTask,
  updateTask,
  addSubMilestone,
  removeSubMilestone,
  updateSubMilestone,
} from "@shared/utils/milestoneTemplateUtils";

type Props = {
  node: TemplateMilestoneData;
  onChange: (updated: TemplateMilestoneData) => void;
  depth?: number;
  modeColor: string;
  onRemove?: () => void;
};

/* ---------------- MilestoneEditor (Recursive) ---------------- */
function MilestoneEditor({
  node,
  onChange,
  depth = 0,
  modeColor,
  onRemove,
}: {
  node: TemplateMilestoneData;
  onChange: (updated: TemplateMilestoneData) => void;
  depth?: number;
  modeColor: string;
  onRemove?: () => void;
}) {
  const handleTitleChange = (value: string) => {
    onChange({ ...node, title: value });
  };

  const handleTaskChange = (index: number, value: string) => {
    onChange(updateTask(node, index, value));
  };

  const handleAddTask = () => {
    onChange(addTask(node));
  };

  const handleRemoveTask = (index: number) => {
    onChange(removeTask(node, index));
  };

  const handleAddSubMilestone = () => {
    onChange(addSubMilestone(node));
  };

  const handleUpdateSubMilestone = (
    index: number,
    updated: TemplateMilestoneData
  ) => {
    onChange(updateSubMilestone(node, index, updated));
  };

  const handleRemoveSubMilestone = (index: number) => {
    onChange(removeSubMilestone(node, index));
  };

  const isRoot = depth === 0;

  return (
    <div className={`flex flex-col gap-4 ${depth > 0 ? "ml-6" : ""}`}>
      {!isRoot && (
        <div className="flex items-center gap-3">
          <span
            className="inline-block"
            style={{
              borderTop: "12px solid " + modeColor,
              borderLeft: "7px solid transparent",
              borderRight: "7px solid transparent",
              width: 0,
              height: 0,
            }}
          />
          <input
            type="text"
            value={node.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Sub‑Milestone Title"
            className="flex-1 px-3 py-2 focus:outline-none text-lg font-medium"
          />
          {onRemove && (
            <button
              onClick={onRemove}
              className="text-gray-400 hover:text-red-600 ml-2"
              aria-label="Remove sub‑milestone"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Tasks */}
      {node.tasks.map((task, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: modeColor }}
          />
          <input
            type="text"
            value={task}
            onChange={(e) => handleTaskChange(i, e.target.value)}
            className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none"
            placeholder={`Task ${i + 1}`}
            style={{ borderColor: modeColor }}
          />
          <button
            onClick={() => handleRemoveTask(i)}
            className="text-gray-400 hover:text-red-600"
            aria-label="Remove task"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}

      <button
        onClick={handleAddTask}
        className="flex items-center gap-2 text-sm font-medium mt-1"
        style={{ color: modeColor }}
      >
        <Plus className="w-4 h-4" /> Add Task
      </button>

      {/* Sub‑Milestones */}
      {node.subMilestones?.map((sub, i) => (
        <div
          key={i}
          className="pl-4 mt-3 border-l-2"
          style={{ borderColor: modeColor }}
        >
          <MilestoneEditor
            node={sub}
            onChange={(updated) => handleUpdateSubMilestone(i, updated)}
            depth={depth + 1}
            modeColor={modeColor}
            onRemove={() => handleRemoveSubMilestone(i)}
          />
        </div>
      ))}

      <button
        onClick={handleAddSubMilestone}
        className="flex items-center gap-2 text-sm font-medium mt-2"
        style={{ color: modeColor }}
      >
        <Plus className="w-4 h-4" /> Add Sub‑Milestone
      </button>
    </div>
  );
}

export default MilestoneEditor;
