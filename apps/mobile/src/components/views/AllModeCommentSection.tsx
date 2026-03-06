import React, { useMemo, useCallback } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import { format, parseISO } from "date-fns";
import { useCommentsByMode } from "@shared/api/hooks/comments/useCommentsByMode";
import type { Comment } from "@shared/types/Comment";
import type { Mode } from "@shared/types/Mode";
import type { Goal } from "@shared/types/Goal";
import type { Project } from "@shared/types/Project";
import type { Milestone } from "@shared/types/Milestone";
import type { Task } from "@shared/types/Task";
import { rawToEntityType, type EntityType } from "@shared/types/rawToEntityType";
import { getEntityBreadcrumb, type Maps } from "@shared/utils/getEntityBreadcrumb";
import EntityIcon from "../EntityIcon";
import { useEntityFormStore } from "../../lib/store/useEntityFormStore";

type Props = {
  mode: Mode;
  goals: Goal[];
  projects: Project[];
  milestones: Milestone[];
  tasks: Task[];
  modes: Mode[];
};

function getCommentEntityType(c: Comment): EntityType | null {
  const src = c.entity_model ?? c.content_type;
  if (src == null) return null;
  return rawToEntityType(src);
}

function getCommentEntityId(c: Comment): number | null {
  const id = c.object_id;
  if (id == null) return null;
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

/* ── Preview card (same as ModeCommentsView) ── */

function PreviewCard({
  comments,
  entityType,
  title,
  breadcrumb,
  modeColor,
  showAuthor,
}: {
  comments: Comment[];
  entityType: EntityType;
  title: string;
  breadcrumb: string;
  modeColor: string;
  showAuthor: boolean;
}) {
  const first = comments[0];
  const authorName = first.author?.displayName || first.author?.username || "You";
  const dateStr = format(parseISO(first.created_at), "PPP p");

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 10,
        padding: 14,
        marginBottom: 10,
        backgroundColor: "#fff",
      }}
    >
      <Text
        numberOfLines={3}
        style={{ fontSize: 14, color: "#1f2937", lineHeight: 20, marginBottom: 6 }}
      >
        {first.body || "[No comment body]"}
      </Text>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
        {showAuthor && first.author && (
          <>
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: "#e0e7ff",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: "600", color: "#4338ca" }}>
                {authorName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#374151" }}>
              {authorName}
            </Text>
          </>
        )}
        <Text style={{ fontSize: 12, color: "#9ca3af" }}>{dateStr}</Text>
      </View>

      {comments.length > 1 && (
        <Text style={{ fontSize: 12, fontWeight: "600", color: "#1f2937", fontStyle: "italic", marginBottom: 6 }}>
          {comments.length - 1} more comment{comments.length - 1 > 1 ? "s" : ""}
        </Text>
      )}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
        <EntityIcon type={entityType} color={modeColor} size={16} />
        <View style={{ flex: 1, flexDirection: "row", alignItems: "baseline" }}>
          <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "500", color: "#374151", flexShrink: 1 }}>
            {title}
          </Text>
          {!!breadcrumb && (
            <>
              <Text style={{ marginHorizontal: 4, color: "#9ca3af", fontSize: 12 }}>|</Text>
              <Text numberOfLines={1} style={{ fontSize: 12, color: "#6b7280", flexShrink: 2 }}>
                {breadcrumb}
              </Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

/* ── General comment card ── */

function GeneralCard({ comment, showAuthor }: { comment: Comment; showAuthor: boolean }) {
  const authorName = comment.author?.displayName || comment.author?.username || "You";
  const dateStr = format(parseISO(comment.created_at), "MMM d, h:mm a");

  return (
    <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
        {showAuthor && (
          <>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: "#e0e7ff",
                justifyContent: "center",
                alignItems: "center",
                marginRight: 6,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: "600", color: "#4338ca" }}>
                {authorName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#111", flex: 1 }}>
              {authorName}
            </Text>
          </>
        )}
        {!showAuthor && <View style={{ flex: 1 }} />}
        <Text style={{ fontSize: 12, color: "#9ca3af" }}>{dateStr}</Text>
      </View>
      <Text style={{ fontSize: 14, color: "#374151", lineHeight: 20 }}>
        {comment.body}
      </Text>
    </View>
  );
}

/* ── Section component ── */

export default function AllModeCommentSection({
  mode,
  goals,
  projects,
  milestones,
  tasks,
  modes,
}: Props) {
  const { data: comments = [], isLoading } = useCommentsByMode(mode.id);
  const isCollab = mode.collaboratorCount > 0;

  const goalMap = useMemo(
    () => Object.fromEntries(goals.map((g) => [g.id, g] as const)),
    [goals]
  );
  const projectMap = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p] as const)),
    [projects]
  );
  const milestoneMap = useMemo(
    () => Object.fromEntries(milestones.map((m) => [m.id, m] as const)),
    [milestones]
  );
  const taskMap = useMemo(
    () => Object.fromEntries(tasks.map((t) => [t.id, t] as const)),
    [tasks]
  );

  const maps: Maps = useMemo(
    () => ({ goalMap, projectMap, milestoneMap, taskMap }),
    [goalMap, projectMap, milestoneMap, taskMap]
  );

  const resolveEntity = useCallback(
    (type: EntityType, id: number) => {
      switch (type) {
        case "task": return taskMap[id];
        case "milestone": return milestoneMap[id];
        case "project": return projectMap[id];
        case "goal": return goalMap[id];
        default: return undefined;
      }
    },
    [taskMap, milestoneMap, projectMap, goalMap]
  );

  const resolveTitle = useCallback(
    (type: EntityType, id: number): string => {
      switch (type) {
        case "task": return taskMap[id]?.title ?? "(Task)";
        case "milestone": return milestoneMap[id]?.title ?? "(Milestone)";
        case "project": return projectMap[id]?.title ?? "(Project)";
        case "goal": return goalMap[id]?.title ?? "(Goal)";
        default: return "(Untitled)";
      }
    },
    [taskMap, milestoneMap, projectMap, goalMap]
  );

  const modeOnlyComments = useMemo(
    () => comments.filter((c) => (c.entity_model ?? "").toLowerCase() === "mode"),
    [comments]
  );

  const entityComments = useMemo(
    () => comments.filter((c) => (c.entity_model ?? "").toLowerCase() !== "mode"),
    [comments]
  );

  // Group entity comments by entity
  const groupedEntityComments = useMemo(() => {
    const map = new Map<string, { type: EntityType; id: number; title: string; comments: Comment[] }>();

    for (const c of entityComments) {
      const type = getCommentEntityType(c);
      const id = getCommentEntityId(c);
      if (!type || id == null || type === "mode") continue;

      const key = `${type}-${id}`;
      const title = c.entity_title?.trim() || resolveTitle(type, id);

      const existing = map.get(key);
      if (existing) {
        existing.comments.push(c);
      } else {
        map.set(key, { type, id, title, comments: [c] });
      }
    }

    const groups = Array.from(map.values());
    groups.sort((a, b) => {
      const aDate = a.comments[0]?.created_at ?? "";
      const bDate = b.comments[0]?.created_at ?? "";
      return bDate.localeCompare(aDate);
    });
    return groups;
  }, [entityComments, resolveTitle]);

  // Don't render section if no comments at all
  if (!isLoading && comments.length === 0) return null;

  return (
    <View style={{ marginBottom: 24 }}>
      {/* Mode header with colored bar */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, marginBottom: 12 }}>
        <View
          style={{
            width: 3,
            height: 18,
            borderRadius: 2,
            backgroundColor: mode.color,
          }}
        />
        <Text style={{ fontSize: 16, fontWeight: "600", color: "#1f2937" }}>
          {mode.title}
        </Text>
      </View>

      {isLoading && (
        <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
          <ActivityIndicator size="small" />
        </View>
      )}

      {/* Entity comment preview cards */}
      {groupedEntityComments.length > 0 && (
        <View style={{ paddingHorizontal: 20 }}>
          {groupedEntityComments.map((group) => {
            const entity = resolveEntity(group.type, group.id);
            const breadcrumb = entity ? getEntityBreadcrumb(entity, maps, { immediateOnly: true }) : "";
            return (
              <TouchableOpacity
                key={`${group.type}-${group.id}`}
                activeOpacity={0.7}
                onPress={() => {
                  if (entity && group.type !== "mode") {
                    useEntityFormStore.getState().openEdit(group.type, entity, { tab: "comments" });
                  }
                }}
              >
                <PreviewCard
                  comments={group.comments}
                  entityType={group.type}
                  title={group.title}
                  breadcrumb={breadcrumb}
                  modeColor={mode.color}
                  showAuthor={isCollab}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* General (mode-level) comments */}
      {modeOnlyComments.length > 0 && (
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 6 }}>
            General Comments
          </Text>
          {modeOnlyComments.map((c) => (
            <GeneralCard key={c.id} comment={c} showAuthor={isCollab} />
          ))}
        </View>
      )}
    </View>
  );
}
