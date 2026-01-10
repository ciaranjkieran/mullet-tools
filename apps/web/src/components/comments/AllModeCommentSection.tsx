"use client";

import { useCommentsByMode } from "@shared/api/hooks/comments/useCommentsByMode";
import ModeEntityCommentsPreview from "./ModeEntityCommentsPreview";
import CommentCard from "./CommentCard";

import { useMemo, useEffect, useState, useCallback } from "react";
import clsx from "clsx";
import { ChevronDown, ChevronRight } from "lucide-react";

import type { Mode } from "@shared/types/Mode";
import type { Task } from "@shared/types/Task";
import type { Milestone } from "@shared/types/Milestone";
import type { Project } from "@shared/types/Project";
import type { Goal } from "@shared/types/Goal";
import type { Comment } from "@shared/types/Comment";

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
  allModes: Mode[];
};

/** ---- helpers ---- */
function getCommentEntityType(
  comment: Pick<Comment, "entity_model" | "content_type">
): EntityType | null {
  return rawToEntityType(comment.entity_model ?? comment.content_type);
}

function getCommentEntityId(
  comment: Pick<Comment, "object_id">
): number | null {
  const n = Number(comment.object_id);
  return Number.isFinite(n) ? n : null;
}

function getCommentCreatedAt(comment: Pick<Comment, "created_at">): string {
  return typeof comment.created_at === "string"
    ? comment.created_at
    : String(comment.created_at);
}

export default function AllModeCommentSection({
  mode,
  tasks,
  milestones,
  projects,
  goals,
  allModes,
}: Props) {
  const { data: comments = [], isLoading } = useCommentsByMode(mode.id);

  const modeOnlyComments = useMemo(
    () =>
      comments.filter((c) => c.content_type === 0 || c.entity_model === "mode"),
    [comments]
  );

  const entityComments = useMemo(
    () =>
      comments.filter((c) => c.content_type !== 0 && c.entity_model !== "mode"),
    [comments]
  );

  const [showEntity, setShowEntity] = useState(true);
  const [showGeneral, setShowGeneral] = useState(true);

  // Filter-by-item state
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<{
    type: EntityType;
    id: number;
    title: string;
  } | null>(null);

  // ---- maps for title fallback ----
  const taskMap = useMemo<Record<number, Task>>(
    () => Object.fromEntries(tasks.map((t) => [t.id, t])),
    [tasks]
  );

  const milestoneMap = useMemo<Record<number, Milestone>>(
    () => Object.fromEntries(milestones.map((m) => [m.id, m])),
    [milestones]
  );

  const projectMap = useMemo<Record<number, Project>>(
    () => Object.fromEntries(projects.map((p) => [p.id, p])),
    [projects]
  );

  const goalMap = useMemo<Record<number, Goal>>(
    () => Object.fromEntries(goals.map((g) => [g.id, g])),
    [goals]
  );

  const modeMap = useMemo<Record<number, Mode>>(
    () => Object.fromEntries(allModes.map((m) => [m.id, m])),
    [allModes]
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
          return modeMap[id]?.title ?? "(Mode)";
        default:
          return "(Untitled)";
      }
    },
    [taskMap, milestoneMap, projectMap, goalMap, modeMap]
  );

  const entityOptions = useMemo(() => {
    type OptionWithMeta = {
      type: EntityType;
      id: number;
      title: string;
      latestCreatedAt: string;
    };

    const map = new Map<string, OptionWithMeta>();

    for (const c of entityComments) {
      const type = getCommentEntityType(c);
      const id = getCommentEntityId(c);
      if (!type || id == null) continue;

      const key = `${type}-${id}`;
      const createdAtStr = getCommentCreatedAt(c);

      // Your Comment type doesn’t include an entity_title, so we always fallback
      const title = resolveEntityTitleFallback(type, id);

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

    // avoid eslint unused-var warning
    return [...nonMode, ...modeOptions].map(
      ({ latestCreatedAt: _latestCreatedAt, ...rest }) => rest
    );
  }, [entityComments, resolveEntityTitleFallback]);

  // Clear selection if entity disappears
  useEffect(() => {
    if (!selectedEntity) return;
    const stillExists = entityOptions.some(
      (e) => e.type === selectedEntity.type && e.id === selectedEntity.id
    );
    if (!stillExists) setSelectedEntity(null);
  }, [entityOptions, selectedEntity]);

  const filteredEntityComments = useMemo(() => {
    if (!selectedEntity) return entityComments;

    return entityComments.filter((c) => {
      const type = getCommentEntityType(c);
      const id = getCommentEntityId(c);
      return (
        type === selectedEntity.type && id != null && id === selectedEntity.id
      );
    });
  }, [entityComments, selectedEntity]);

  const shouldShowFilterUI =
    entityOptions.length > 1 &&
    entityComments.length + modeOnlyComments.length > 2;

  if (!isLoading && comments.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span
          className="w-1.5 h-5 rounded-sm"
          style={{ backgroundColor: mode.color }}
        />
        <h2 className="text-lg font-semibold text-gray-800">{mode.title}</h2>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Loading...</p>}

      {/* Entity comments */}
      {entityComments.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <button
              className="flex items-center gap-2 text-md text-black-700 font-semibold hover:underline"
              onClick={() => setShowEntity((prev) => !prev)}
            >
              {showEntity ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              Commented Items in {mode.title}
              {selectedEntity ? (
                <span className="text-sm font-normal text-gray-500">
                  (filtered)
                </span>
              ) : null}
            </button>

            {selectedEntity && (
              <button
                onClick={() => setSelectedEntity(null)}
                className="text-sm text-gray-500 hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>

          {/* Filter UI (under header) */}
          {showEntity && shouldShowFilterUI && (
            <div className="mb-2">
              <button
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
                            e.currentTarget.style.backgroundColor =
                              "transparent";
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

          {showEntity && (
            <ModeEntityCommentsPreview
              comments={filteredEntityComments}
              tasks={tasks}
              milestones={milestones}
              projects={projects}
              goals={goals}
              modes={allModes}
              selectedMode={mode}
            />
          )}
        </div>
      )}

      {/* General comments (hide properly during filter) */}
      {!selectedEntity && modeOnlyComments.length > 0 && (
        <div className="space-y-2">
          <button
            className="flex items-center gap-2 text-md text-black-700 font-semibold hover:underline"
            onClick={() => setShowGeneral((prev) => !prev)}
          >
            {showGeneral ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            General Comments
          </button>

          {showGeneral &&
            modeOnlyComments.map((comment) => (
              <CommentCard key={comment.id} comment={comment} />
            ))}
        </div>
      )}
    </div>
  );
}
