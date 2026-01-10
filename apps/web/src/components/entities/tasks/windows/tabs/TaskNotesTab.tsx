"use client";

import { useRef } from "react";
import type { CSSProperties } from "react";
import type React from "react";

import { useNotesByEntity } from "@shared/api/hooks/notes/useNotesByEntity";
import NoteCard from "@/components/notes/NoteCard";
import NoteComposer from "@/components/notes/NoteComposer";

import { Task } from "@shared/types/Task";
import { Mode } from "@shared/types/Mode";

type Props = {
  task: Task;
  modes: Mode[];
};

type NoteComposerHandle = {
  focus: () => void;
};

export default function TaskNotesTab({ task, modes }: Props) {
  const { data: notes = [], isLoading } = useNotesByEntity("task", task.id);

  const mode = modes.find((m) => m.id === task.modeId);
  const modeColor = mode?.color ?? "#555";

  const composerRef = useRef<NoteComposerHandle | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const refocusIfNonInteractive = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    const interactive = t.closest(
      "button, a, input, textarea, select, [contenteditable='true'], [role='button']"
    );
    if (!interactive) composerRef.current?.focus();
  };

  const containerStyle = {
    ["--scrollbar-color"]: modeColor,
  } as CSSProperties;

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 flex flex-col overflow-y-auto scrollbar-thin mb-6"
      style={containerStyle}
      onMouseDown={refocusIfNonInteractive}
    >
      <div className="flex flex-col h-full p-6 mt-4 space-y-6">
        <div className="space-y-4 pr-2">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Notes</h2>

          {isLoading ? (
            <p className="text-sm text-gray-500 italic">Loading notes...</p>
          ) : notes.length > 0 ? (
            notes.map((note) => (
              <NoteCard key={note.id} note={note} modeLevel={false} />
            ))
          ) : (
            <p className="text-sm text-gray-500 italic">No notes yet.</p>
          )}
        </div>

        <NoteComposer
          ref={composerRef}
          key={`${task.id}-${task.modeId}`}
          modeId={task.modeId}
          modeColor={modeColor}
          entity="task"
          entityId={task.id}
          entityTitle={task.title}
        />
      </div>
    </div>
  );
}
