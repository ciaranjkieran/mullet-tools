"use client";

import { useMemo, useEffect, useState } from "react";
import clsx from "clsx";
import { ChevronDown, ChevronRight } from "lucide-react";

import { useCommentsByMode } from "@shared/api/hooks/comments/useCommentsByMode";

import { Mode } from "@shared/types/Mode";
import { Task } from "@shared/types/Task";
import { Milestone } from "@shared/types/Milestone";
import { Project } from "@shared/types/Project";
import { Goal } from "@shared/types/Goal";

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

function getCommentEntityType(comment: {
  entity_model?: string;
  content_type: number;
}): EntityType | null {
  return rawToEntityType(comment.entity_model ?? comment.content_type);
}

function getCommentEntityId(comment: { object_id: number }): number | null {
  const n = Number(comment.object_id);
  return Number.isFinite(n) ? n : null;
}

function getCommentCreatedAt(comment: { created_at: string }): string {
  return typeof comment.created_at === "string"
    ? comment.created_at
    : String(comment.created_at);
}

// ✅ NEW: prefer backend-provided title
function getCommentEntityTitle(comment: any): string | null {
  return typeof comment?.entity_title === "string" &&
    comment.entity_title.trim()
    ? comment.entity_title.trim()
    : null;
}

export default function ModeCommentsView({
  tasks,
  milestones,
  projects,
  goals,
  modes,
  selectedMode,
}: Props) {
  const { data: modeComments = [], isLoading } = useCommentsByMode(
    selectedMode === "All" ? 0 : selectedMode.id
  );

  const comments = selectedMode === "All" ? [] : modeComments;

  const modeOnlyComments = comments.filter(
    (c: any) => c.content_type === 0 || c.entity_model === "mode"
  );
  const entityComments = comments.filter(
    (c: any) => c.content_type !== 0 && c.entity_model !== "mode"
  );

  // (Now optional fallback) maps for when entity_title is missing
  const taskMap = useMemo(
    () => Object.fromEntries(tasks.map((t) => [t.id, t])),
    [tasks]
  );
  const milestoneMap = useMemo(
    () => Object.fromEntries(milestones.map((m) => [m.id, m])),
    [milestones]
  );
  const projectMap = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p])),
    [projects]
  );
  const goalMap = useMemo(
    () => Object.fromEntries(goals.map((g) => [g.id, g])),
    [goals]
  );
  const modeMap = useMemo(
    () => Object.fromEntries(modes.map((m) => [m.id, m])),
    [modes]
  );

  const resolveEntityTitleFallback = (type: EntityType, id: number): string => {
    switch (type) {
      case "task":
        return (taskMap as any)[id]?.title ?? "(Task)";
      case "milestone":
        return (milestoneMap as any)[id]?.title ?? "(Milestone)";
      case "project":
        return (projectMap as any)[id]?.title ?? "(Project)";
      case "goal":
        return (goalMap as any)[id]?.title ?? "(Goal)";
      case "mode":
        return (modeMap as any)[id]?.title ?? "(Mode)";
      default:
        return "(Untitled)";
    }
  };

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

    for (const c of entityComments as any[]) {
      const type = getCommentEntityType(c);
      const id = getCommentEntityId(c);
      if (!type || id == null) continue;

      const key = `${type}-${id}`;
      const createdAtStr = getCommentCreatedAt(c);

      // ✅ prefer backend title
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

    return [...nonMode, ...modeOptions].map(
      ({ latestCreatedAt, ...rest }) => rest
    );
  }, [entityComments, taskMap, milestoneMap, projectMap, goalMap, modeMap]);

  useEffect(() => {
    if (!selectedEntity) return;
    const stillExists = entityOptions.some(
      (e) => e.type === selectedEntity.type && e.id === selectedEntity.id
    );
    if (!stillExists) setSelectedEntity(null);
  }, [entityOptions, selectedEntity]);

  const filteredEntityComments = selectedEntity
    ? entityComments.filter((c: any) => {
        const type = getCommentEntityType(c);
        const id = getCommentEntityId(c);
        return (
          type === selectedEntity.type && id != null && id === selectedEntity.id
        );
      })
    : entityComments;

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
                    selectedMode={selectedMode}
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

                {modeOnlyComments.map((comment: any) => (
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
