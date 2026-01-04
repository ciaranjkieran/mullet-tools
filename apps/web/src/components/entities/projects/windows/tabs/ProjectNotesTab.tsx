"use client";

import { useRef, useEffect } from "react";
import { useNotesByEntity } from "@shared/api/hooks/notes/useNotesByEntity";
import NoteCard from "@/components/notes/NoteCard";
import NoteComposer from "@/components/notes/NoteComposer";
import Spinner from "@/components/status/Spinner";
import { Project } from "@shared/types/Project";

type Props = {
  project: Project;
  modeColor: string;
};

type NoteComposerHandle = { focus: () => void };

export default function ProjectNotesTab({ project, modeColor }: Props) {
  const { data: notes = [], isLoading } = useNotesByEntity(
    "project",
    project.id
  );
  const modeLevel = false;

  const composerRef = useRef<NoteComposerHandle | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const refocusIfNonInteractive = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    const interactive = t.closest(
      "button, a, input, textarea, select, [contenteditable='true'], [role='button']"
    );
    if (!interactive) composerRef.current?.focus();
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }, [project.id, notes.length]);

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 flex flex-col overflow-y-auto scrollbar-thin mb-6"
      style={{ ["--scrollbar-color" as any]: modeColor }}
      onMouseDown={refocusIfNonInteractive}
    >
      <div className="flex flex-col h-full p-6 mt-4 space-y-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Notes</h2>

        {isLoading ? (
          <Spinner />
        ) : notes.length > 0 ? (
          notes.map((note) => (
            <NoteCard key={note.id} note={note} modeLevel={modeLevel} />
          ))
        ) : (
          <p className="text-sm text-gray-500 italic">No notes yet.</p>
        )}

        <NoteComposer
          ref={composerRef}
          key={`${project.id}-${project.modeId}`}
          modeId={project.modeId}
          entity="project"
          entityId={project.id}
          modeColor={modeColor}
          entityTitle={project.title}
          autoFocus
        />
      </div>
    </div>
  );
}
