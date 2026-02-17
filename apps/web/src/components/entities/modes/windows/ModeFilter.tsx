// src/components/entities/modes/windows/ModeFilter.tsx
"use client";

import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
  closestCenter,
  DragEndEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useModeStore } from "@shared/store/useModeStore";
import { getContrastingText } from "@shared/utils/getContrastingText";
import { useUpdateModePositions } from "@shared/api/hooks/modes/useUpdateModePositions";
import { useState, useEffect, useRef } from "react";
import { LocateFixed, X } from "lucide-react";
import { Mode } from "@shared/types/Mode";
import { useTimerSelectionStore } from "@/lib/store/useTimerSelectionStore";

function SortableModeButton({
  id,
  title,
  color,
  mode,
  setActiveId,
}: {
  id: number;
  title: string;
  color: string;
  mode: Mode;
  setActiveId: (id: number | null) => void;
}) {
  const selectedMode = useModeStore((s) => s.selectedMode);
  const setSelectedMode = useModeStore((s) => s.setSelectedMode);

  const [isHovered, setIsHovered] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  useEffect(() => {
    if (isDragging) setActiveId(id);
    else setActiveId(null);
  }, [isDragging, id, setActiveId]);

  const isActive = selectedMode !== "All" && selectedMode.id === mode.id;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
        opacity: isDragging ? 0 : 1,
      }}
      {...attributes}
    >
      <button
        ref={buttonRef}
        {...listeners}
        onClick={() => {
          // 1) update global Mode tab
          setSelectedMode(mode);

          // 2) reset timer selection for this mode
          const timerSel = useTimerSelectionStore.getState();

          timerSel.setRaw({
            modeId: mode.id,
            goalId: null,
            projectId: null,
            milestoneId: null,
            taskId: null,
          });

          timerSel.saveSnapshotForMode(mode.id, {
            goalId: null,
            projectId: null,
            milestoneId: null,
            taskId: null,
          });
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="px-2 py-0.5 md:px-3 md:py-1 rounded-full border transition select-none text-sm md:text-base"
        style={{
          backgroundColor: isActive ? color : "#F3F4F6",
          color: isActive ? getContrastingText(mode.color) : "#111",
          borderColor: isActive ? mode.color : "#D1D5DB",
          cursor: isHovered ? (isActive ? "grab" : "pointer") : "default",
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </button>
    </div>
  );
}

export default function ModeFilter({
  isModeFocus,
  setIsModeFocus,
}: {
  isModeFocus: boolean;
  setIsModeFocus: (fn: (prev: boolean) => boolean) => void;
}) {
  const modes = useModeStore((s) => s.modes);
  const setModes = useModeStore((s) => s.setModes);
  const selectedMode = useModeStore((s) => s.selectedMode);
  const setSelectedMode = useModeStore((s) => s.setSelectedMode);
  const updatePositions = useUpdateModePositions();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
  );

  const [activeId, setActiveId] = useState<number | null>(null);
  const activeMode = modes.find((m) => m.id === activeId);

  // ✅ Sort modes by position before rendering
  const sortedModes = [...modes].sort(
    (a, b) => (a.position ?? 9999) - (b.position ?? 9999),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!active || !over || active.id === over.id) return;

    const oldIndex = sortedModes.findIndex((m) => m.id === active.id);
    const newIndex = sortedModes.findIndex((m) => m.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...sortedModes];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    const updatedWithPositions = reordered.map((mode, index) => ({
      ...mode,
      position: index,
    }));

    setModes(updatedWithPositions);
    updatePositions.mutate(
      updatedWithPositions.map((m) => ({ id: m.id, position: m.position })),
    );
  };

  return (
    <div className="overflow-x-auto scrollbar-hide py-2 pb-2">
      {sortedModes.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedModes.map((m) => m.id)} // ✅ use sorted list
            strategy={horizontalListSortingStrategy}
          >
            <div
              className={`flex flex-wrap items-center gap-1.5 md:gap-2 mb-4 md:mb-5 ${
                isModeFocus ? "justify-start" : ""
              }`}
            >
              {(!isModeFocus || selectedMode === "All") && (
                <button
                  onClick={() => {
                    setSelectedMode("All");

                    // Also reset timer selection when going to All
                    const timerSel = useTimerSelectionStore.getState();
                    timerSel.setRaw({
                      modeId: -1,
                      goalId: null,
                      projectId: null,
                      milestoneId: null,
                      taskId: null,
                    });
                  }}
                  className="px-2 py-0.5 md:px-3 md:py-1 rounded-full border transition select-none text-sm md:text-base"
                  style={{
                    backgroundColor: selectedMode === "All" ? "#000" : "#F3F4F6",
                    color: selectedMode === "All" ? "#fff" : "#111",
                    borderColor: selectedMode === "All" ? "#000" : "#D1D5DB",
                    cursor: "pointer",
                  }}
                >
                  All
                </button>
              )}

              {sortedModes
                .filter(
                  (mode) =>
                    !isModeFocus ||
                    (selectedMode !== "All" && mode.id === selectedMode.id),
                )
                .map((mode) => (
                  <SortableModeButton
                    key={mode.id}
                    id={mode.id}
                    mode={mode}
                    title={mode.title}
                    color={mode.color}
                    setActiveId={setActiveId}
                  />
                ))}

              <button
                onClick={() => setIsModeFocus((prev) => !prev)}
                aria-label={
                  isModeFocus ? "Exit Mode Focus" : "Focus on Selected Mode"
                }
                className="text-green-700 hover:text-green-800 transition p-1 rounded-sm focus:outline-none focus:ring-2 focus:ring-green-300 ml-1 cursor-pointer"
              >
                {isModeFocus ? (
                  <X size={18} strokeWidth={2} />
                ) : (
                  <LocateFixed size={24} strokeWidth={2} />
                )}
              </button>
            </div>
          </SortableContext>

          <DragOverlay>
            {activeMode && (
              <button
                className="px-3 py-1 rounded-full border transition select-none"
                style={{
                  backgroundColor: activeMode.color,
                  color: getContrastingText(activeMode.color),
                  borderColor: activeMode.color,
                  whiteSpace: "nowrap",
                }}
              >
                {activeMode.title}
              </button>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
