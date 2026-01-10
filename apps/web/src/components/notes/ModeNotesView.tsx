"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { ChevronDown, ChevronRight } from "lucide-react";

import { useFetchNotesByMode } from "@shared/api/hooks/notes/useFetchNotesByMode";
import { useNoteStore } from "@shared/store/useNoteStore";
import NoteComposer from "./NoteComposer";
import NoteCard from "./NoteCard";
import { getEntityBreadcrumbFromNote } from "@shared/utils/getEntityBreadcrumbFromNote";

import type { Note } from "@shared/types/Note";
import type { Mode } from "@shared/types/Mode";
import type { Milestone } from "@shared/types/Milestone";
import type { Project } from "@shared/types/Project";
import type { Goal } from "@shared/types/Goal";
import type { Task } from "@shared/types/Task";

import AllModeNoteSection from "./AllModeNoteSection";

import {
  rawToEntityType,
  type EntityType,
} from "@shared/types/rawToEntityType";

type Props = {
  mode: Mode | "All" | null;
  modes: Mode[];
  goals: Goal[];
  projects: Project[];
  milestones: Milestone[];
  tasks: Task[];
};

/**
 * Helpers based on your Note model:
 * - content_type: string
 * - object_id: number
 * - display_title / entityTitle: optional titles
 * - created_at: string
 */
function getNoteEntityType(note: Note): EntityType | null {
  return rawToEntityType(note.content_type);
}

function getNoteEntityId(note: Note): number | null {
  return typeof note.object_id === "number" ? note.object_id : null;
}

function getNoteEntityTitle(note: Note): string {
  return note.display_title || note.entityTitle || "(Untitled)";
}

function getNoteCreatedAt(note: Note): string {
  return note.created_at;
}

export default function ModeNotesView({
  mode,
  modes,
  goals,
  projects,
  milestones,
  tasks,
}: Props) {
  const isAll = mode === "All";

  const goalMap = useMemo(
    () => Object.fromEntries(goals.map((g) => [g.id, g])),
    [goals]
  );
  const projectMap = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p])),
    [projects]
  );
  const milestoneMap = useMemo(
    () => Object.fromEntries(milestones.map((m) => [m.id, m])),
    [milestones]
  );
  const taskMap = useMemo(
    () => Object.fromEntries(tasks.map((t) => [t.id, t])),
    [tasks]
  );

  const { setNotes } = useNoteStore();
  const visibleNotes = useNoteStore((state) => state.notes) as Note[];

  const { data: notes, isLoading } = useFetchNotesByMode(
    !isAll && mode ? mode.id : 0
  );

  useEffect(() => {
    if (!isAll && notes) setNotes(notes);
  }, [notes, isAll, setNotes]);

  const composerRef = useRef<HTMLDivElement | null>(null);

  // Filter-by-item UI state
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<{
    type: EntityType;
    id: number;
    title: string;
  } | null>(null);

  const entityOptions = useMemo(() => {
    type OptionWithMeta = {
      type: EntityType;
      id: number;
      title: string;
      latestCreatedAt: string;
    };

    const map = new Map<string, OptionWithMeta>();

    for (const n of visibleNotes) {
      const type = getNoteEntityType(n);
      const id = getNoteEntityId(n);
      if (!type || id == null) continue;

      const key = `${type}-${id}`;
      const createdAtStr = getNoteCreatedAt(n);
      const title = getNoteEntityTitle(n);

      const existing = map.get(key);
      if (!existing) {
        map.set(key, { type, id, title, latestCreatedAt: createdAtStr });
      } else if (createdAtStr > existing.latestCreatedAt) {
        map.set(key, { ...existing, latestCreatedAt: createdAtStr });
      }
    }

    const all = Array.from(map.values());

    // non-mode first, mode last
    const nonMode = all.filter((o) => o.type !== "mode");
    const modeOptions = all.filter((o) => o.type === "mode");

    nonMode.sort((a, b) => b.latestCreatedAt.localeCompare(a.latestCreatedAt));
    modeOptions.sort((a, b) =>
      b.latestCreatedAt.localeCompare(a.latestCreatedAt)
    );

    return [...nonMode, ...modeOptions].map(
      ({ latestCreatedAt: _latest, ...rest }) => rest
    );
  }, [visibleNotes]);

  useEffect(() => {
    if (!selectedEntity) return;
    const stillExists = entityOptions.some(
      (e) => e.type === selectedEntity.type && e.id === selectedEntity.id
    );
    if (!stillExists) setSelectedEntity(null);
  }, [entityOptions, selectedEntity]);

  const filteredNotes: Note[] = selectedEntity
    ? visibleNotes.filter((n) => {
        const type = getNoteEntityType(n);
        const id = getNoteEntityId(n);
        return (
          type === selectedEntity.type && id != null && id === selectedEntity.id
        );
      })
    : visibleNotes;

  if (isAll) {
    return (
      <div className="overflow-y-auto flex-1 p-6 space-y-12">
        {modes.map((m) => (
          <AllModeNoteSection
            key={m.id}
            mode={m}
            tasks={tasks}
            milestones={milestones}
            projects={projects}
            goals={goals}
          />
        ))}
      </div>
    );
  }

  const modeObj = mode && typeof mode !== "string" ? mode : null;

  const composerTarget = modeObj
    ? selectedEntity
      ? {
          entity: selectedEntity.type,
          entityId: selectedEntity.id,
          entityTitle: selectedEntity.title,
        }
      : {
          entity: "mode" as const,
          entityId: modeObj.id,
          entityTitle: modeObj.title,
        }
    : null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-8 p-8">
        {/* Filter UI */}
        {visibleNotes.length > 2 && (
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowFilterOptions((prev) => !prev)}
              className="flex items-center gap-2 text-md text-gray-700 font-semibold hover:underline"
              type="button"
            >
              {showFilterOptions ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              Filter by Item
            </button>

            {selectedEntity && (
              <button
                onClick={() => setSelectedEntity(null)}
                className="text-sm text-gray-500 hover:underline"
                type="button"
              >
                Clear filter
              </button>
            )}
          </div>
        )}

        {showFilterOptions && (
          <div>
            {entityOptions.length === 0 ? (
              <p className="text-sm text-gray-500">
                No linked items found for these notes yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {entityOptions.map((entity) => {
                  const isSelected =
                    selectedEntity?.id === entity.id &&
                    selectedEntity?.type === entity.type;

                  return (
                    <button
                      key={`${entity.type}-${entity.id}`}
                      onClick={() => setSelectedEntity(entity)}
                      className={clsx(
                        "text-sm px-3 py-1 rounded border transition-colors duration-200 relative overflow-hidden font-normal",
                        isSelected
                          ? "border-blue-500 text-blue-900"
                          : "border-gray-300 text-black"
                      )}
                      style={{
                        backgroundColor:
                          isSelected && modeObj
                            ? `${modeObj.color}33`
                            : "transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected && modeObj) {
                          e.currentTarget.style.backgroundColor = `${modeObj.color}22`;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }
                      }}
                      type="button"
                    >
                      {entity.title}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {isLoading && <p className="text-gray-500">Loading notes...</p>}

        {filteredNotes.map((note) => {
          const breadcrumb = getEntityBreadcrumbFromNote(
            note,
            { goalMap, projectMap, milestoneMap, taskMap },
            { immediateOnly: true }
          );

          return (
            <NoteCard
              key={note.id}
              note={note}
              breadcrumb={breadcrumb}
              modeLevel
            />
          );
        })}

        {!isLoading && filteredNotes.length === 0 && (
          <p className="text-gray-400 italic">
            No notes{selectedEntity ? " for this item" : ""} yet — start
            reflecting below.
          </p>
        )}
      </div>

      {modeObj && composerTarget && (
        <div ref={composerRef} className="border-t p-4 bg-white shadow-sm">
          <NoteComposer
            key={`${modeObj.id}-${composerTarget.entity}-${composerTarget.entityId}`}
            modeId={modeObj.id}
            modeColor={modeObj.color}
            entity={composerTarget.entity}
            entityId={composerTarget.entityId}
            entityTitle={composerTarget.entityTitle}
          />
        </div>
      )}
    </div>
  );
}
