import React, { useState, useMemo, useEffect, useCallback, type ReactElement } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { useCommentsByMode } from "@shared/api/hooks/comments/useCommentsByMode";
import { usePostComment } from "@shared/api/hooks/comments/usePostComment";
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
import AllModeCommentSection from "./AllModeCommentSection";

type Props = {
  modes: Mode[];
  selectedMode: Mode | "All";
  goals: Goal[];
  projects: Project[];
  milestones: Milestone[];
  tasks: Task[];
  modeColor: string;
  listHeader?: ReactElement;
};

type SelectedEntity = { type: EntityType; id: number; title: string };

/* ── helpers ── */

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

/* ── Comment preview card (matches web CommentPreviewCard) ── */

function CommentPreviewCard({
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
      {/* Comment body */}
      <Text
        numberOfLines={3}
        style={{ fontSize: 14, color: "#1f2937", lineHeight: 20, marginBottom: 6 }}
      >
        {first.body || "[No comment body]"}
      </Text>

      {/* Author + date */}
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

      {/* More comments count */}
      {comments.length > 1 && (
        <Text style={{ fontSize: 12, fontWeight: "600", color: "#1f2937", fontStyle: "italic", marginBottom: 6 }}>
          {comments.length - 1} more comment{comments.length - 1 > 1 ? "s" : ""}
        </Text>
      )}

      {/* Entity icon + title + breadcrumb */}
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

/* ── General comment card (mode-level comments) ── */

function GeneralCommentCard({
  comment,
  showAuthor,
}: {
  comment: Comment;
  showAuthor: boolean;
}) {
  const authorName = comment.author?.displayName || comment.author?.username || "You";
  const dateStr = format(parseISO(comment.created_at), "MMM d, h:mm a");

  return (
    <View
      style={{
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
        paddingHorizontal: 20,
      }}
    >
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
                marginRight: 8,
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

      {comment.attachments.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6, gap: 6 }}>
          {comment.attachments.map((att) => (
            <View
              key={att.id}
              style={{
                backgroundColor: "#f3f4f6",
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
              }}
            >
              <Text style={{ fontSize: 11, color: "#6b7280" }} numberOfLines={1}>
                {att.original_name}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/* ── Main component ── */

export default function ModeCommentsView({
  modes,
  selectedMode,
  goals,
  projects,
  milestones,
  tasks,
  modeColor,
  listHeader,
}: Props) {
  const modeId = selectedMode === "All" ? 0 : (selectedMode as Mode).id;
  const isCollab =
    selectedMode !== "All" && (selectedMode as Mode).collaboratorCount > 0;

  const { data: modeComments = [], isLoading } = useCommentsByMode(modeId);
  const postComment = usePostComment();
  const [body, setBody] = useState("");

  // Entity maps for breadcrumb generation
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
  const modeMap = useMemo(
    () => Object.fromEntries(modes.map((m) => [m.id, m] as const)),
    [modes]
  );

  const maps: Maps = useMemo(
    () => ({ goalMap, projectMap, milestoneMap, taskMap }),
    [goalMap, projectMap, milestoneMap, taskMap]
  );

  const comments: Comment[] = selectedMode === "All" ? [] : modeComments;

  // Separate mode-only vs entity comments
  const modeOnlyComments = useMemo(
    () => comments.filter((c) => (c.entity_model ?? "").toLowerCase() === "mode"),
    [comments]
  );
  const entityComments = useMemo(
    () => comments.filter((c) => (c.entity_model ?? "").toLowerCase() !== "mode"),
    [comments]
  );

  // Resolve title fallback from local data
  const resolveTitle = useCallback(
    (type: EntityType, id: number): string => {
      switch (type) {
        case "task": return taskMap[id]?.title ?? "(Task)";
        case "milestone": return milestoneMap[id]?.title ?? "(Milestone)";
        case "project": return projectMap[id]?.title ?? "(Project)";
        case "goal": return goalMap[id]?.title ?? "(Goal)";
        case "mode": return modeMap[id]?.title ?? "(Mode)";
        default: return "(Untitled)";
      }
    },
    [taskMap, milestoneMap, projectMap, goalMap, modeMap]
  );

  // Resolve entity object from maps
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

  // Filter state
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null);

  // Build entity options for filter chips
  const entityOptions = useMemo(() => {
    type OptionWithMeta = SelectedEntity & { latestCreatedAt: string };
    const map = new Map<string, OptionWithMeta>();

    for (const c of entityComments) {
      const type = getCommentEntityType(c);
      const id = getCommentEntityId(c);
      if (!type || id == null) continue;

      const key = `${type}-${id}`;
      const createdAt = c.created_at;
      const title = c.entity_title?.trim() || resolveTitle(type, id);

      const existing = map.get(key);
      if (!existing) {
        map.set(key, { type, id, title, latestCreatedAt: createdAt });
      } else if (createdAt > existing.latestCreatedAt) {
        map.set(key, { ...existing, latestCreatedAt: createdAt });
      }
    }

    const all = Array.from(map.values());
    const nonMode = all.filter((o) => o.type !== "mode");
    nonMode.sort((a, b) => b.latestCreatedAt.localeCompare(a.latestCreatedAt));
    return nonMode.map((o) => ({ type: o.type, id: o.id, title: o.title }));
  }, [entityComments, resolveTitle]);

  // Clear filter if entity no longer exists
  useEffect(() => {
    if (!selectedEntity) return;
    const stillExists = entityOptions.some(
      (e) => e.type === selectedEntity.type && e.id === selectedEntity.id
    );
    if (!stillExists) setSelectedEntity(null);
  }, [entityOptions, selectedEntity]);

  // Filtered entity comments
  const filteredEntityComments = useMemo(() => {
    if (!selectedEntity) return entityComments;
    return entityComments.filter((c) => {
      const type = getCommentEntityType(c);
      const id = getCommentEntityId(c);
      return type === selectedEntity.type && id === selectedEntity.id;
    });
  }, [entityComments, selectedEntity]);

  // Group entity comments by entity for preview cards
  const groupedEntityComments = useMemo(() => {
    const map = new Map<string, { type: EntityType; id: number; title: string; comments: Comment[] }>();

    for (const c of filteredEntityComments) {
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

    // Sort by latest comment
    const groups = Array.from(map.values());
    groups.sort((a, b) => {
      const aDate = a.comments[0]?.created_at ?? "";
      const bDate = b.comments[0]?.created_at ?? "";
      return bDate.localeCompare(aDate);
    });
    return groups;
  }, [filteredEntityComments, resolveTitle]);

  const shouldShowFilterUI =
    entityComments.length + modeOnlyComments.length > 2 && entityOptions.length > 0;

  const handleSend = () => {
    const trimmed = body.trim();
    if (!trimmed || selectedMode === "All") return;

    postComment.mutate(
      {
        entity: "mode",
        entityId: modeId,
        modeId,
        body: trimmed,
      },
      { onSuccess: () => setBody("") }
    );
  };

  /* ── "All" state ── */
  if (selectedMode === "All") {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        {listHeader}
        {modes.map((m) => (
          <AllModeCommentSection
            key={m.id}
            mode={m}
            goals={goals}
            projects={projects}
            milestones={milestones}
            tasks={tasks}
            modes={modes}
          />
        ))}
      </ScrollView>
    );
  }

  /* ── Loading ── */
  if (isLoading) {
    return (
      <View style={{ flex: 1 }}>
        {listHeader}
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" />
        </View>
      </View>
    );
  }

  /* ── Build list data ── */
  type ListItem =
    | { kind: "filter" }
    | { kind: "entityGroup"; type: EntityType; id: number; title: string; comments: Comment[] }
    | { kind: "generalHeader" }
    | { kind: "generalComment"; comment: Comment }
    | { kind: "emptyEntity" }
    | { kind: "emptyGeneral" };

  const listData: ListItem[] = [];

  // Entity section
  if (entityComments.length > 0 || selectedEntity) {
    if (shouldShowFilterUI) {
      listData.push({ kind: "filter" });
    }

    if (groupedEntityComments.length > 0) {
      for (const group of groupedEntityComments) {
        listData.push({ kind: "entityGroup", ...group });
      }
    } else if (selectedEntity) {
      listData.push({ kind: "emptyEntity" });
    }
  }

  // General comments section
  if (!selectedEntity) {
    listData.push({ kind: "generalHeader" });
    if (modeOnlyComments.length > 0) {
      for (const c of modeOnlyComments) {
        listData.push({ kind: "generalComment", comment: c });
      }
    } else {
      listData.push({ kind: "emptyGeneral" });
    }
  }

  const renderItem = ({ item }: { item: ListItem }) => {
    switch (item.kind) {
      case "filter":
        return (
          <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
            {selectedEntity && (
              <View style={{ flexDirection: "row", justifyContent: "flex-end", marginBottom: 6 }}>
                <TouchableOpacity onPress={() => setSelectedEntity(null)}>
                  <Text style={{ fontSize: 13, color: "#6b7280", textDecorationLine: "underline" }}>
                    Clear filter
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
              onPress={() => setShowFilterOptions((prev) => !prev)}
              style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 }}
            >
              <Feather
                name={showFilterOptions ? "chevron-down" : "chevron-right"}
                size={16}
                color="#374151"
              />
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}>
                Filter by Item
              </Text>
            </TouchableOpacity>
            {showFilterOptions && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {entityOptions.map((entity) => {
                  const isSelected =
                    selectedEntity?.id === entity.id &&
                    selectedEntity?.type === entity.type;
                  return (
                    <TouchableOpacity
                      key={`${entity.type}-${entity.id}`}
                      onPress={() => setSelectedEntity(entity)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: isSelected ? modeColor : "#d1d5db",
                        backgroundColor: isSelected ? modeColor + "15" : "#f3f4f6",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          color: "#111",
                        }}
                        numberOfLines={1}
                      >
                        {entity.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        );

      case "entityGroup": {
        const entity = resolveEntity(item.type, item.id);
        const breadcrumb = entity ? getEntityBreadcrumb(entity, maps) : "";
        return (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              if (entity && item.type !== "mode") {
                useEntityFormStore.getState().openEdit(item.type, entity, { tab: "comments" });
              }
            }}
            style={{ paddingHorizontal: 20 }}
          >
            <CommentPreviewCard
              comments={item.comments}
              entityType={item.type}
              title={item.title}
              breadcrumb={breadcrumb}
              modeColor={modeColor}
              showAuthor={isCollab}
            />
          </TouchableOpacity>
        );
      }

      case "emptyEntity":
        return (
          <View style={{ paddingHorizontal: 20 }}>
            <Text style={{ fontSize: 14, color: "#9ca3af", fontStyle: "italic" }}>
              No comments for this item yet.
            </Text>
          </View>
        );

      case "generalHeader":
        return (
          <View style={{ paddingHorizontal: 20, marginTop: 16, marginBottom: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#1f2937" }}>
              General Comments
            </Text>
          </View>
        );

      case "generalComment":
        return <GeneralCommentCard comment={item.comment} showAuthor={isCollab} />;

      case "emptyGeneral":
        return (
          <View style={{ paddingHorizontal: 20 }}>
            <Text style={{ fontSize: 14, color: "#9ca3af", fontStyle: "italic" }}>
              No general comments yet.
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 160 : 0}
    >
      <FlatList
        data={listData}
        keyExtractor={(item, index) => {
          if (item.kind === "entityGroup") return `eg-${item.type}-${item.id}`;
          if (item.kind === "generalComment") return `gc-${item.comment.id}`;
          return `${item.kind}-${index}`;
        }}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 80 }}>
            <Feather name="message-square" size={24} color="#d1d5db" />
            <Text style={{ color: "#9ca3af", fontSize: 14, marginTop: 8 }}>
              No comments yet
            </Text>
          </View>
        }
      />

      {/* Composer */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
          backgroundColor: "#fff",
        }}
      >
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Write a comment..."
          placeholderTextColor="#9ca3af"
          style={{
            flex: 1,
            backgroundColor: "#f9fafb",
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 10,
            fontSize: 14,
            color: "#111",
            maxHeight: 100,
          }}
          multiline
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!body.trim() || postComment.isPending}
          style={{
            marginLeft: 10,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: body.trim() ? modeColor : "#e5e7eb",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {postComment.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Feather name="send" size={16} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
