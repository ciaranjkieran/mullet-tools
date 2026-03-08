"use client";

import React, { useRef, useCallback } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import {
  TemplateProjectData,
  TemplateMilestoneData,
} from "@shared/types/Template";
import MilestoneEditor from "../milestone/MilestoneEditor";
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

/* ---- Stable ID generation ---- */
let _idCounter = 0;
function genId() {
  return `tpl-${++_idCounter}`;
}

function useStableIds(count: number) {
  const idsRef = useRef<string[]>([]);
  while (idsRef.current.length < count) idsRef.current.push(genId());
  if (idsRef.current.length > count) idsRef.current.length = count;
  return idsRef.current;
}

/* ---- Sortable row wrapper ---- */
function SortableRow({
  id,
  children,
}: {
  id: string;
  children: (handleProps: React.HTMLAttributes<HTMLButtonElement>) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

type Props = {
  node: TemplateProjectData;
  onChange: (updated: TemplateProjectData) => void;
  depth?: number;
  modeColor: string;
  onRemove?: () => void;
  /** Drag handle props passed from parent DnD context */
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
};

export default function ProjectEditor({
  node,
  onChange,
  depth = 0,
  modeColor,
  onRemove,
  dragHandleProps,
}: Props) {
  const isRoot = depth === 0;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  /* ---------------- Task Handling ---------------- */
  const handleTaskChange = (index: number, value: string) =>
    onChange(updateTask(node, index, value));
  const handleAddTask = () => onChange(addTask(node));
  const handleRemoveTask = (index: number) => onChange(removeTask(node, index));

  const taskIds = useStableIds((node.tasks || []).length);

  const handleTaskDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = taskIds.indexOf(active.id as string);
      const newIndex = taskIds.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;
      const newTasks = arrayMove([...(node.tasks || [])], oldIndex, newIndex);
      const reorderedIds = arrayMove([...taskIds], oldIndex, newIndex);
      taskIds.length = 0;
      taskIds.push(...reorderedIds);
      onChange({ ...node, tasks: newTasks });
    },
    [node, onChange, taskIds]
  );

  /* ---------------- Sub-Project Handling ---------------- */
  const handleAddSubProject = () => onChange(addSubProject(node));
  const handleRemoveSubProject = (index: number) =>
    onChange(removeSubProject(node, index));
  const handleSubProjectChange = (
    index: number,
    updated: TemplateProjectData
  ) => onChange(updateSubProject(node, index, updated));

  const subProjectIds = useStableIds((node.subProjects || []).length);

  const handleSubProjectDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = subProjectIds.indexOf(active.id as string);
      const newIndex = subProjectIds.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;
      const newSubs = arrayMove([...(node.subProjects || [])], oldIndex, newIndex);
      const reorderedIds = arrayMove([...subProjectIds], oldIndex, newIndex);
      subProjectIds.length = 0;
      subProjectIds.push(...reorderedIds);
      onChange({ ...node, subProjects: newSubs });
    },
    [node, onChange, subProjectIds]
  );

  /* ---------------- Milestone Handling ---------------- */
  const handleAddMilestone = () => onChange(addMilestone(node));
  const handleRemoveMilestone = (index: number) =>
    onChange(removeMilestone(node, index));
  const handleMilestoneChange = (
    index: number,
    updated: TemplateMilestoneData
  ) => onChange(updateMilestone(node, index, updated));

  const milestoneIds = useStableIds((node.subMilestones || []).length);

  const handleMilestoneDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = milestoneIds.indexOf(active.id as string);
      const newIndex = milestoneIds.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;
      const newMs = arrayMove([...(node.subMilestones || [])], oldIndex, newIndex);
      const reorderedIds = arrayMove([...milestoneIds], oldIndex, newIndex);
      milestoneIds.length = 0;
      milestoneIds.push(...reorderedIds);
      onChange({ ...node, subMilestones: newMs });
    },
    [node, onChange, milestoneIds]
  );

  return (
    <div className={`flex flex-col gap-4 ${depth > 0 ? "ml-6" : ""}`}>
      {/* Sub-project Title (root handled by BuildProjectTemplateWindow) */}
      {!isRoot && (
        <div className="flex items-center gap-2">
          {dragHandleProps && (
            <button
              {...dragHandleProps}
              className="p-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
              aria-label="Drag to reorder"
            >
              <GripVertical className="w-4 h-4" />
            </button>
          )}
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
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleTaskDragEnd}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {(node.tasks || []).map((task, i) => (
            <SortableRow key={taskIds[i]} id={taskIds[i]}>
              {(handleProps) => (
                <div className="flex items-center gap-2">
                  <button
                    {...handleProps}
                    className="p-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
                    aria-label="Drag to reorder"
                  >
                    <GripVertical className="w-4 h-4" />
                  </button>
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
              )}
            </SortableRow>
          ))}
        </SortableContext>
      </DndContext>

      <button
        onClick={handleAddTask}
        className="flex items-center gap-2 text-sm font-medium mt-1"
        style={{ color: modeColor }}
      >
        <Plus className="w-4 h-4" /> Add Task
      </button>

      {/* Milestones */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleMilestoneDragEnd}
      >
        <SortableContext items={milestoneIds} strategy={verticalListSortingStrategy}>
          {(node.subMilestones || []).map((milestone, i) => (
            <SortableRow key={milestoneIds[i]} id={milestoneIds[i]}>
              {(handleProps) => (
                <div
                  className="pl-4 mt-3 border-l-2"
                  style={{ borderColor: modeColor }}
                >
                  <MilestoneEditor
                    node={milestone}
                    onChange={(updated) => handleMilestoneChange(i, updated)}
                    depth={1}
                    modeColor={modeColor}
                    onRemove={() => handleRemoveMilestone(i)}
                    dragHandleProps={handleProps}
                  />
                </div>
              )}
            </SortableRow>
          ))}
        </SortableContext>
      </DndContext>

      <button
        onClick={handleAddMilestone}
        className="flex items-center gap-2 text-sm font-medium mt-2"
        style={{ color: modeColor }}
      >
        <Plus className="w-4 h-4" /> Add Milestone
      </button>

      {/* Sub‑Projects */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleSubProjectDragEnd}
      >
        <SortableContext items={subProjectIds} strategy={verticalListSortingStrategy}>
          {(node.subProjects || []).map((sub, i) => (
            <SortableRow key={subProjectIds[i]} id={subProjectIds[i]}>
              {(handleProps) => (
                <div
                  className="pl-4 mt-3 border-l-2"
                  style={{ borderColor: modeColor }}
                >
                  <ProjectEditor
                    node={sub}
                    onChange={(updated) => handleSubProjectChange(i, updated)}
                    depth={depth + 1}
                    modeColor={modeColor}
                    onRemove={() => handleRemoveSubProject(i)}
                    dragHandleProps={handleProps}
                  />
                </div>
              )}
            </SortableRow>
          ))}
        </SortableContext>
      </DndContext>

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
