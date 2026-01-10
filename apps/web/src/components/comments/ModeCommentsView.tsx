"use client";

import { useMemo, useEffect, useState, useCallback } from "react";
import clsx from "clsx";
import { ChevronDown, ChevronRight } from "lucide-react";

import { useCommentsByMode } from "@shared/api/hooks/comments/useCommentsByMode";

import type { Comment } from "@shared/types/Comment";
import type { Mode } from "@shared/types/Mode";
import type { Task } from "@shared/types/Task";
import type { Milestone } from "@shared/types/Milestone";
import type { Project } from "@shared/types/Project";
import type { Goal } from "@shared/types/Goal";

import CommentCard from "./CommentCard";
import ModeCommentComposer from "./ModeCommentComposer";
import ModeEntityCommentsPreview from "./ModeEntityCommentsPreview";
import AllModeCommentSection from "./AllModeCommentSection";

import {
  rawToEntityType,
  type EntityType,
} from "@shared/types/rawToEntityType";

type Props = {
  tasks: Task[];
  milestones: Milestone[];
  projects: Project[];
  goals: Goal[];
  modes: Mode[];
  selectedMode: Mode | "All";
};

function getCommentEntityType(
  comment: Pick<Comment, "entity_model" | "content_type">
): EntityType | null {
  // rawToEntityType can accept string or number — but your Comment type allows null
  const src = comment.entity_model ?? comment.content_type;
  if (src == null) return null;
  return rawToEntityType(src);
}

function getCommentEntityId(
  comment: Pick<Comment, "object_id">
): number | null {
  const id = comment.object_id;
  if (id == null) return null;
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

function getCommentCreatedAt(comment: Pick<Comment, "created_at">): string {
  return typeof comment.created_at === "string"
    ? comment.created_at
    : String(comment.created_at);
}

// prefer backend title
function getCommentEntityTitle(
  comment: Pick<Comment, "entity_title">
): string | null {
  const t = comment.entity_title;
  if (typeof t !== "string") return null;
  const trimmed = t.trim();
  return trimmed ? trimmed : null;
}

type SelectedEntity = { type: EntityType; id: number; title: string };

export default function ModeCommentsView({
  tasks,
  milestones,
  projects,
  goals,
  modes,
  selectedMode,
}: Props) {
  const modeId = selectedMode === "All" ? 0 : selectedMode.id;

  const { data: modeComments = [], isLoading } = useCommentsByMode(modeId);

  const comments: Comment[] = selectedMode === "All" ? [] : modeComments;

  const modeOnlyComments = useMemo(
    () =>
      comments.filter(
        (c) =>
          c.content_type === 0 ||
          (c.entity_model ?? "").toLowerCase() === "mode"
      ),
    [comments]
  );

  const entityComments = useMemo(
    () =>
      comments.filter(
        (c) =>
          c.content_type !== 0 &&
          (c.entity_model ?? "").toLowerCase() !== "mode"
      ),
    [comments]
  );

  // fallback maps (only used when entity_title missing)
  const taskMap = useMemo(
    () => Object.fromEntries(tasks.map((t) => [t.id, t] as const)),
    [tasks]
  );
  const milestoneMap = useMemo(
    () => Object.fromEntries(milestones.map((m) => [m.id, m] as const)),
    [milestones]
  );
  const projectMap = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p] as const)),
    [projects]
  );
  const goalMap = useMemo(
    () => Object.fromEntries(goals.map((g) => [g.id, g] as const)),
    [goals]
  );
  const modeMap = useMemo(
    () => Object.fromEntries(modes.map((m) => [m.id, m] as const)),
    [modes]
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

  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(
    null
  );

  const entityOptions = useMemo(() => {
    type OptionWithMeta = SelectedEntity & { latestCreatedAt: string };

    const map = new Map<string, OptionWithMeta>();

    for (const c of entityComments) {
      const type = getCommentEntityType(c);
      const id = getCommentEntityId(c);
      if (!type || id == null) continue;

      const key = `${type}-${id}`;
      const createdAtStr = getCommentCreatedAt(c);

      const title =
        getCommentEntityTitle(c) ?? resolveEntityTitleFallback(type, id);

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

    // avoid eslint “unused var” by explicitly picking only the fields we return
    const ordered = [...nonMode, ...modeOptions];
    return ordered.map((o) => ({ type: o.type, id: o.id, title: o.title }));
  }, [entityComments, resolveEntityTitleFallback]);

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
    entityComments.length + modeOnlyComments.length > 2 &&
    entityOptions.length > 0;

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-6rem)]">
      {selectedMode === "All" ? (
        <div className="overflow-y-auto flex-1 p-6 space-y-12">
          {modes.map((mode) => (
            <AllModeCommentSection
              key={mode.id}
              mode={mode}
              tasks={tasks}
              milestones={milestones}
              projects={projects}
              goals={goals}
              allModes={modes}
            />
          ))}
        </div>
      ) : (
        <>
          <div className="overflow-y-auto flex-1 p-6 space-y-8">
            {(entityComments.length > 0 || selectedEntity) && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Commented Items in {selectedMode.title}
                    {selectedEntity ? (
                      <span className="ml-2 text-sm font-normal text-gray-500">
                        (filtered)
                      </span>
                    ) : null}
                  </h2>

                  {selectedEntity && (
                    <button
                      onClick={() => setSelectedEntity(null)}
                      className="text-sm text-gray-500 hover:underline"
                    >
                      Clear filter
                    </button>
                  )}
                </div>

                {shouldShowFilterUI && (
                  <div className="mb-4">
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
                            >
                              {entity.title}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {filteredEntityComments.length > 0 ? (
                  <ModeEntityCommentsPreview
                    comments={filteredEntityComments}
                    tasks={tasks}
                    milestones={milestones}
                    projects={projects}
                    goals={goals}
                    modes={modes}
                  />
                ) : (
                  !isLoading && (
                    <p className="text-sm text-gray-500 italic">
                      No comments for this item yet.
                    </p>
                  )
                )}
              </div>
            )}

            {!selectedEntity && (
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-2">
                  General Comments
                </h2>

                {isLoading && (
                  <p className="text-sm text-gray-500">Loading...</p>
                )}

                {modeOnlyComments.map((comment) => (
                  <CommentCard key={comment.id} comment={comment} />
                ))}

                {!isLoading && modeOnlyComments.length === 0 && (
                  <p className="text-sm text-gray-500 italic mb-2">
                    No general comments yet.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="border-t p-4">
            <ModeCommentComposer />
          </div>
        </>
      )}
    </div>
  );
}
