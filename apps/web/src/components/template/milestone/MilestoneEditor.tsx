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
import { TemplateMilestoneData } from "@shared/types/Template";

import {
  addTask,
  removeTask,
  updateTask,
  addSubMilestone,
  removeSubMilestone,
  updateSubMilestone,
} from "@shared/utils/milestoneTemplateUtils";

/* ---- Stable ID generation ---- */
let _idCounter = 0;
function genId() {
  return `ms-tpl-${++_idCounter}`;
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
  node: TemplateMilestoneData;
  onChange: (updated: TemplateMilestoneData) => void;
  depth?: number;
  modeColor: string;
  onRemove?: () => void;
  /** Drag handle props passed from parent DnD context */
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
};

/* ---------------- MilestoneEditor (Recursive) ---------------- */
function MilestoneEditor({
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

  const taskIds = useStableIds(node.tasks.length);

  const handleTaskDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = taskIds.indexOf(active.id as string);
      const newIndex = taskIds.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;
      const newTasks = arrayMove([...node.tasks], oldIndex, newIndex);
      const reorderedIds = arrayMove([...taskIds], oldIndex, newIndex);
      taskIds.length = 0;
      taskIds.push(...reorderedIds);
      onChange({ ...node, tasks: newTasks });
    },
    [node, onChange, taskIds]
  );

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

  const subMilestoneIds = useStableIds((node.subMilestones || []).length);

  const handleSubMilestoneDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = subMilestoneIds.indexOf(active.id as string);
      const newIndex = subMilestoneIds.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;
      const newSubs = arrayMove([...(node.subMilestones || [])], oldIndex, newIndex);
      const reorderedIds = arrayMove([...subMilestoneIds], oldIndex, newIndex);
      subMilestoneIds.length = 0;
      subMilestoneIds.push(...reorderedIds);
      onChange({ ...node, subMilestones: newSubs });
    },
    [node, onChange, subMilestoneIds]
  );

  return (
    <div className={`flex flex-col gap-4 ${depth > 0 ? "ml-6" : ""}`}>
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
            placeholder="Sub-Milestone Title"
            className="flex-1 px-3 py-2 focus:outline-none text-lg font-medium"
          />
          {onRemove && (
            <button
              onClick={onRemove}
              className="text-gray-400 hover:text-red-600 ml-2"
              aria-label="Remove sub-milestone"
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
          {node.tasks.map((task, i) => (
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

      {/* Sub-Milestones */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleSubMilestoneDragEnd}
      >
        <SortableContext items={subMilestoneIds} strategy={verticalListSortingStrategy}>
          {(node.subMilestones || []).map((sub, i) => (
            <SortableRow key={subMilestoneIds[i]} id={subMilestoneIds[i]}>
              {(handleProps) => (
                <div
                  className="pl-4 mt-3 border-l-2"
                  style={{ borderColor: modeColor }}
                >
                  <MilestoneEditor
                    node={sub}
                    onChange={(updated) => handleUpdateSubMilestone(i, updated)}
                    depth={depth + 1}
                    modeColor={modeColor}
                    onRemove={() => handleRemoveSubMilestone(i)}
                    dragHandleProps={handleProps}
                  />
                </div>
              )}
            </SortableRow>
          ))}
        </SortableContext>
      </DndContext>

      <button
        onClick={handleAddSubMilestone}
        className="flex items-center gap-2 text-sm font-medium mt-2"
        style={{ color: modeColor }}
      >
        <Plus className="w-4 h-4" /> Add Sub-Milestone
      </button>
    </div>
  );
}

export default MilestoneEditor;
