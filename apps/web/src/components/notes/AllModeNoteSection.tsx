"use client";

import { useMemo, useEffect, useState, useCallback } from "react";
import clsx from "clsx";
import { ChevronDown, ChevronRight } from "lucide-react";

import { useFetchNotesByMode } from "@shared/api/hooks/notes/useFetchNotesByMode";
import NoteCard from "./NoteCard";
import { getEntityBreadcrumbFromNote } from "@shared/utils/getEntityBreadcrumbFromNote";

import type { Note } from "@shared/types/Note";
import type { Mode } from "@shared/types/Mode";
import type { Task } from "@shared/types/Task";
import type { Milestone } from "@shared/types/Milestone";
import type { Project } from "@shared/types/Project";
import type { Goal } from "@shared/types/Goal";

import {
  rawToEntityType,
  type EntityType,
} from "@shared/types/rawToEntityType";

type Props = {
  mode: Mode;
  tasks: Task[];
  milestones: Milestone[];
  projects: Project[];
  goals: Goal[];
};

function getNoteEntityType(note: Note): EntityType | null {
  return rawToEntityType(note.content_type);
}

function getNoteEntityId(note: Note): number | null {
  return typeof note.object_id === "number" ? note.object_id : null;
}

function getNoteCreatedAt(note: Note): string {
  return note.created_at;
}

export default function AllModeNoteSection({
  mode,
  tasks,
  milestones,
  projects,
  goals,
}: Props) {
  const { data: notes = [], isLoading } = useFetchNotesByMode(mode.id) as {
    data?: Note[];
    isLoading: boolean;
  };

  const [isExpanded, setIsExpanded] = useState(true);

  // Filter-by-item state
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<{
    type: EntityType;
    id: number;
    title: string;
  } | null>(null);

  // Maps (id -> entity)
  const goalMap = useMemo<Record<number, Goal>>(
    () => Object.fromEntries(goals.map((g) => [g.id, g])),
    [goals]
  );
  const projectMap = useMemo<Record<number, Project>>(
    () => Object.fromEntries(projects.map((p) => [p.id, p])),
    [projects]
  );
  const milestoneMap = useMemo<Record<number, Milestone>>(
    () => Object.fromEntries(milestones.map((m) => [m.id, m])),
    [milestones]
  );
  const taskMap = useMemo<Record<number, Task>>(
    () => Object.fromEntries(tasks.map((t) => [t.id, t])),
    [tasks]
  );

  const resolveEntityTitleFallback = useCallback(
    (type: EntityType, id: number): string => {
      switch (type) {
        case "task":
          return taskMap[id]?.title ?? "(Task)";
        case "milestone":
          return milestoneMap[id]?.title ?? "(Milestone)";
        case "project":
          return projectMap[id]?.title ?? "(Project)";
        case "goal":
          return goalMap[id]?.title ?? "(Goal)";
        case "mode":
          return mode.title;
        default:
          return "(Untitled)";
      }
    },
    [taskMap, milestoneMap, projectMap, goalMap, mode.title]
  );

  const entityOptions = useMemo(() => {
    type OptionWithMeta = {
      type: EntityType;
      id: number;
      title: string;
      latestCreatedAt: string;
    };

    const map = new Map<string, OptionWithMeta>();

    for (const n of notes) {
      const type = getNoteEntityType(n);
      const id = getNoteEntityId(n);
      if (!type || id == null) continue;

      const key = `${type}-${id}`;
      const createdAtStr = getNoteCreatedAt(n);

      // Prefer server-provided title if present, otherwise fallback
      const title =
        (typeof n.display_title === "string" && n.display_title.trim()
          ? n.display_title.trim()
          : null) ?? resolveEntityTitleFallback(type, id);

      const existing = map.get(key);
      if (!existing) {
        map.set(key, { type, id, title, latestCreatedAt: createdAtStr });
      } else if (createdAtStr > existing.latestCreatedAt) {
        map.set(key, { ...existing, latestCreatedAt: createdAtStr });
      }
    }

    const all = Array.from(map.values());
    const nonMode = all.filter((o) => o.type !== "mode");
    const modeOptions = all.filter((o) => o.type === "mode");

    nonMode.sort((a, b) => b.latestCreatedAt.localeCompare(a.latestCreatedAt));
    modeOptions.sort((a, b) =>
      b.latestCreatedAt.localeCompare(a.latestCreatedAt)
    );

    // drop meta field (rename to _latest so eslint doesn't complain)
    return [...nonMode, ...modeOptions].map(
      ({ latestCreatedAt: _latest, ...rest }) => rest
    );
  }, [notes, resolveEntityTitleFallback]);

  useEffect(() => {
    if (!selectedEntity) return;
    const stillExists = entityOptions.some(
      (e) => e.type === selectedEntity.type && e.id === selectedEntity.id
    );
    if (!stillExists) setSelectedEntity(null);
  }, [entityOptions, selectedEntity]);

  const filteredNotes: Note[] = useMemo(() => {
    if (!selectedEntity) return notes;

    return notes.filter((n) => {
      const type = getNoteEntityType(n);
      const id = getNoteEntityId(n);
      return (
        type === selectedEntity.type && id != null && id === selectedEntity.id
      );
    });
  }, [notes, selectedEntity]);

  const shouldShowFilterUI = entityOptions.length > 1 && notes.length > 2;

  // Decide render at the end (no hook mismatch)
  const shouldRenderSection = isLoading || notes.length > 0;
  if (!shouldRenderSection) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span
          className="w-1.5 h-5 rounded-sm"
          style={{ backgroundColor: mode.color }}
        />
        <h2 className="text-lg font-semibold text-gray-800">{mode.title}</h2>
      </div>

      {notes.length > 0 && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="flex items-center gap-2 text-md text-black-700 font-semibold hover:underline"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            Reflections in {mode.title}
            {selectedEntity ? (
              <span className="text-sm font-normal text-gray-500">
                (filtered)
              </span>
            ) : null}
          </button>

          {selectedEntity && (
            <button
              type="button"
              onClick={() => setSelectedEntity(null)}
              className="text-sm text-gray-500 hover:underline"
            >
              Clear filter
            </button>
          )}
        </div>
      )}

      {isExpanded && shouldShowFilterUI && (
        <div className="mb-1">
          <button
            type="button"
            onClick={() => setShowFilterOptions((prev) => !prev)}
            className="flex items-center gap-2 text-sm text-gray-700 font-semibold hover:underline"
          >
            {showFilterOptions ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            Filter by Item
          </button>

          {showFilterOptions && (
            <div className="mt-3 flex flex-wrap gap-2">
              {entityOptions.map((entity) => {
                const isSelected =
                  selectedEntity?.id === entity.id &&
                  selectedEntity?.type === entity.type;

                return (
                  <button
                    type="button"
                    key={`${entity.type}-${entity.id}`}
                    onClick={() => setSelectedEntity(entity)}
                    className={clsx(
                      "text-sm px-3 py-1 rounded border transition-colors duration-200 relative overflow-hidden font-normal",
                      isSelected
                        ? "border-blue-500 text-blue-900"
                        : "border-gray-300 text-black"
                    )}
                    style={{
                      backgroundColor: isSelected
                        ? `${mode.color}33`
                        : "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = `${mode.color}22`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    {entity.title}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {isExpanded && (
        <div className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading notes...</p>
          ) : filteredNotes.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              No reflections{selectedEntity ? " for this item" : ""}.
            </p>
          ) : (
            filteredNotes.map((note) => {
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
                  modeLevel={true}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
