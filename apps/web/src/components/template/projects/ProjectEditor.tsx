"use client";

import { Plus, Trash2 } from "lucide-react";
import {
  TemplateProjectData,
  TemplateMilestoneData,
} from "@shared/types/Template";
import MilestoneEditor from "../milestone/MilestoneEditor";
import { FolderIcon as OutlineFolderIcon } from "lucide-react";
import {
  addTask,
  removeTask,
  updateTask,
  addSubProject,
  removeSubProject,
  updateSubProject,
  addMilestone,
  removeMilestone,
  updateMilestone,
} from "@shared/utils/projectTemplateUtils";

type Props = {
  node: TemplateProjectData;
  onChange: (updated: TemplateProjectData) => void;
  depth?: number;
  modeColor: string;
  onRemove?: () => void;
};
export default function ProjectEditor({
  node,
  onChange,
  depth = 0,
  modeColor,
  onRemove,
}: Props) {
  const isRoot = depth === 0;

  /* ---------------- Task Handling ---------------- */
  const handleTaskChange = (index: number, value: string) =>
    onChange(updateTask(node, index, value));
  const handleAddTask = () => onChange(addTask(node));
  const handleRemoveTask = (index: number) => onChange(removeTask(node, index));

  /* ---------------- Sub-Project Handling ---------------- */
  const handleAddSubProject = () => onChange(addSubProject(node));
  const handleRemoveSubProject = (index: number) =>
    onChange(removeSubProject(node, index));
  const handleSubProjectChange = (
    index: number,
    updated: TemplateProjectData
  ) => onChange(updateSubProject(node, index, updated));

  /* ---------------- Milestone Handling ---------------- */
  const handleAddMilestone = () => onChange(addMilestone(node));
  const handleRemoveMilestone = (index: number) =>
    onChange(removeMilestone(node, index));
  const handleMilestoneChange = (
    index: number,
    updated: TemplateMilestoneData
  ) => onChange(updateMilestone(node, index, updated));

  return (
    <div className={`flex flex-col gap-4 ${depth > 0 ? "ml-6" : ""}`}>
      {/* Sub-project Title (root handled by BuildProjectTemplateWindow) */}
      {!isRoot && (
        <div className="flex items-center gap-3">
          {/* Filled Folder Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill={modeColor}
            className="w-6 h-6"
          >
            <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h5.379a1.5 1.5 0 0 1 1.06.44l1.621 1.62H19.5A1.5 1.5 0 0 1 21 6.56V18a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 18V4.5Z" />
          </svg>

          <input
            type="text"
            value={node.title}
            onChange={(e) => onChange({ ...node, title: e.target.value })}
            placeholder="Sub‑Project Title"
            className="flex-1 px-3 py-2 focus:outline-none text-lg font-medium"
          />

          {/* Delete Button */}
          {onRemove && (
            <button
              onClick={onRemove}
              className="text-gray-400 hover:text-red-600 ml-2"
              aria-label="Remove sub‑project"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Tasks */}
      {(node.tasks || []).map((task, i) => (
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

      {/* Milestones */}
      {(node.subMilestones || []).map((milestone, i) => (
        <div
          key={i}
          className="pl-4 mt-3 border-l-2"
          style={{ borderColor: modeColor }}
        >
          <MilestoneEditor
            node={milestone}
            onChange={(updated) => handleMilestoneChange(i, updated)}
            depth={1}
            modeColor={modeColor}
            onRemove={() => handleRemoveMilestone(i)}
          />
        </div>
      ))}

      <button
        onClick={handleAddMilestone}
        className="flex items-center gap-2 text-sm font-medium mt-2"
        style={{ color: modeColor }}
      >
        <Plus className="w-4 h-4" /> Add Milestone
      </button>

      {/* Sub‑Projects */}
      {(node.subProjects || []).map((sub, i) => (
        <div
          key={i}
          className="pl-4 mt-3 border-l-2"
          style={{ borderColor: modeColor }}
        >
          <ProjectEditor
            node={sub}
            onChange={(updated) => handleSubProjectChange(i, updated)}
            depth={depth + 1}
            modeColor={modeColor}
            onRemove={() => handleRemoveSubProject(i)}
          />
        </div>
      ))}

      <button
        onClick={handleAddSubProject}
        className="flex items-center gap-2 text-sm font-medium mt-2"
        style={{ color: modeColor }}
      >
        <Plus className="w-4 h-4" /> Add Sub‑Project
      </button>
    </div>
  );
}
