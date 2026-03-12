import React, { useState, useMemo, useEffect, useCallback, useRef, type ReactElement } from "react";
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
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { useFetchNotesByMode } from "@shared/api/hooks/notes/useFetchNotesByMode";
import { usePostNote } from "@shared/api/hooks/notes/usePostNote";
import { useDeleteNote } from "@shared/api/hooks/notes/useDeleteNote";
import type { Note } from "@shared/types/Note";
import type { Mode } from "@shared/types/Mode";
import type { Goal } from "@shared/types/Goal";
import type { Project } from "@shared/types/Project";
import type { Milestone } from "@shared/types/Milestone";
import type { Task } from "@shared/types/Task";
import { rawToEntityType, type EntityType } from "@shared/types/rawToEntityType";
import { getEntityBreadcrumbFromNote } from "@shared/utils/getEntityBreadcrumbFromNote";
import type { Maps } from "@shared/utils/getEntityBreadcrumb";
import AllModeNoteSection from "./AllModeNoteSection";
import RichNoteBody from "../notes/RichNoteBody";
import FormatToolbar from "../notes/FormatToolbar";


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

function getNoteEntityType(note: Note): EntityType | null {
  return rawToEntityType(note.content_type);
}

function getNoteEntityId(note: Note): number | null {
  return typeof note.object_id === "number" ? note.object_id : null;
}

function getNoteEntityTitle(note: Note): string {
  return note.display_title || note.entityTitle || "(Untitled)";
}

/* ── Note card matching web NoteCard styling ── */

function NoteCard({
  note,
  onDelete,
  showAuthor,
  breadcrumb,
  modeColor,
}: {
  note: Note;
  onDelete: () => void;
  showAuthor: boolean;
  breadcrumb: string;
  modeColor: string;
}) {
  const authorName = note.author?.displayName || "Me";
  const dateStr = format(parseISO(note.created_at), "PPP p");

  const displayTitle = note.display_title || note.entityTitle || "";
  const isModeNote = (note.content_type ?? "").toLowerCase().includes("mode");

  return (
    <View
      style={{
        marginHorizontal: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 10,
        padding: 14,
        backgroundColor: "#fafafa",
      }}
    >
      {/* Note body */}
      <View style={{ marginBottom: 8 }}>
        <RichNoteBody html={note.body} />
      </View>

      {/* Divider + meta */}
      <View style={{ borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 8 }}>
        {/* Author + date */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
          {showAuthor && note.author && (
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

        {/* Entity title + breadcrumb */}
        {!isModeNote && displayTitle ? (
          <View style={{ marginTop: 2 }}>
            <Text style={{ fontSize: 12, color: "#4b5563" }}>
              <Text style={{ fontWeight: "500", color: "#111" }}>{displayTitle}</Text>
              {!!breadcrumb && (
                <Text style={{ color: "#6b7280" }}> | {breadcrumb}</Text>
              )}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Delete button */}
      <TouchableOpacity
        onPress={() =>
          Alert.alert("Delete Note", "Remove this note permanently?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: onDelete },
          ])
        }
        style={{ alignSelf: "flex-end", marginTop: 6, padding: 4 }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="trash-2" size={14} color="#9ca3af" />
      </TouchableOpacity>
    </View>
  );
}

/* ── Main component ── */

export default function ModeNotesView({
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

  const { data: notes = [], isLoading } = useFetchNotesByMode(modeId);
  const postNote = usePostNote();
  const deleteNote = useDeleteNote();
  const [body, setBody] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const selectionRef = useRef({ start: 0, end: 0 });
  const inputRef = useRef<any>(null);

  const wrapSelection = useCallback((tag: string) => {
    const { start, end } = selectionRef.current;
    const before = body.slice(0, start);
    const selected = body.slice(start, end);
    const after = body.slice(end);
    const wrapped = selected
      ? `${before}<${tag}>${selected}</${tag}>${after}`
      : `${before}<${tag}></${tag}>${after}`;
    setBody(wrapped);
    // Move cursor after closing tag
    const cursorPos = selected
      ? start + tag.length + 2 + selected.length + tag.length + 3
      : start + tag.length + 2 + tag.length + 3;
    setTimeout(() => {
      inputRef.current?.setNativeProps?.({
        selection: { start: cursorPos, end: cursorPos },
      });
    }, 50);
  }, [body]);

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

  // Resolve title fallback
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

  // Filter state
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null);

  // Build entity options for filter chips
  const entityOptions = useMemo(() => {
    type OptionWithMeta = SelectedEntity & { latestCreatedAt: string };
    const map = new Map<string, OptionWithMeta>();

    for (const n of notes) {
      const type = getNoteEntityType(n);
      const id = getNoteEntityId(n);
      if (!type || id == null) continue;

      const key = `${type}-${id}`;
      const createdAt = n.created_at;
      const title = getNoteEntityTitle(n);

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
  }, [notes]);

  // Clear filter if entity no longer exists
  useEffect(() => {
    if (!selectedEntity) return;
    const stillExists = entityOptions.some(
      (e) => e.type === selectedEntity.type && e.id === selectedEntity.id
    );
    if (!stillExists) setSelectedEntity(null);
  }, [entityOptions, selectedEntity]);

  // Filtered notes
  const filteredNotes = useMemo(() => {
    if (!selectedEntity) return notes;
    return notes.filter((n) => {
      const type = getNoteEntityType(n);
      const id = getNoteEntityId(n);
      return type === selectedEntity.type && id === selectedEntity.id;
    });
  }, [notes, selectedEntity]);

  const shouldShowFilterUI = notes.length > 2 && entityOptions.length > 0;

  const handlePost = () => {
    const trimmed = body.trim();
    if (!trimmed || selectedMode === "All") return;

    postNote.mutate(
      {
        body: trimmed,
        mode_id: modeId,
        content_type: "mode",
        object_id: modeId,
      },
      {
        onSuccess: () => {
          setBody("");
          setComposerOpen(false);
        },
      }
    );
  };

  const handleDelete = (noteId: number) => {
    deleteNote.mutate(noteId);
  };

  /* ── "All" state ── */
  if (selectedMode === "All") {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        {listHeader}
        {modes.map((m) => (
          <AllModeNoteSection
            key={m.id}
            mode={m}
            goals={goals}
            projects={projects}
            milestones={milestones}
            tasks={tasks}
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
    | { kind: "note"; note: Note }
    | { kind: "empty" };

  const listData: ListItem[] = [];

  if (shouldShowFilterUI) {
    listData.push({ kind: "filter" });
  }

  if (filteredNotes.length > 0) {
    for (const n of filteredNotes) {
      listData.push({ kind: "note", note: n });
    }
  } else {
    listData.push({ kind: "empty" });
  }

  const renderItem = ({ item }: { item: ListItem }) => {
    switch (item.kind) {
      case "filter":
        return (
          <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <TouchableOpacity
                onPress={() => setShowFilterOptions((prev) => !prev)}
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
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
              {selectedEntity && (
                <TouchableOpacity onPress={() => setSelectedEntity(null)}>
                  <Text style={{ fontSize: 13, color: "#6b7280", textDecorationLine: "underline" }}>
                    Clear filter
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {showFilterOptions && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {entityOptions.length === 0 ? (
                  <Text style={{ fontSize: 13, color: "#6b7280" }}>
                    No linked items found for these notes yet.
                  </Text>
                ) : (
                  entityOptions.map((entity) => {
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
                  })
                )}
              </View>
            )}
          </View>
        );

      case "note": {
        const breadcrumb = getEntityBreadcrumbFromNote(item.note, maps, { immediateOnly: true });
        return (
          <NoteCard
            note={item.note}
            onDelete={() => handleDelete(item.note.id)}
            showAuthor={isCollab}
            breadcrumb={breadcrumb}
            modeColor={modeColor}
          />
        );
      }

      case "empty":
        return (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 80 }}>
            <Feather name="edit" size={24} color="#d1d5db" />
            <Text style={{ color: "#9ca3af", fontSize: 14, marginTop: 8 }}>
              No notes{selectedEntity ? " for this item" : ""} yet
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
          if (item.kind === "note") return `note-${item.note.id}`;
          return `${item.kind}-${index}`;
        }}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 100, flexGrow: 1 }}
      />

      {/* Composer area */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
          backgroundColor: "#fff",
          padding: 12,
        }}
      >
        {composerOpen ? (
          <View>
            <FormatToolbar
              onBold={() => wrapSelection("b")}
              onItalic={() => wrapSelection("i")}
              onUnderline={() => wrapSelection("u")}
              modeColor={modeColor}
            />
            <TextInput
              ref={inputRef}
              value={body}
              onChangeText={setBody}
              onSelectionChange={(e) => {
                selectionRef.current = e.nativeEvent.selection;
              }}
              placeholder="Write a note..."
              placeholderTextColor="#9ca3af"
              style={{
                backgroundColor: "#f9fafb",
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                fontSize: 14,
                color: "#111",
                minHeight: 80,
                textAlignVertical: "top",
              }}
              multiline
              autoFocus
            />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                marginTop: 8,
                gap: 8,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  setComposerOpen(false);
                  setBody("");
                }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: "#f3f4f6",
                }}
              >
                <Text style={{ color: "#6b7280", fontWeight: "500" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePost}
                disabled={!body.trim() || postNote.isPending}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: body.trim() ? modeColor : "#e5e7eb",
                }}
              >
                {postNote.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "600" }}>
                    Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setComposerOpen(true)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: modeColor + "15",
            }}
          >
            <Feather name="plus" size={18} color={modeColor} />
            <Text
              style={{
                marginLeft: 6,
                fontWeight: "600",
                color: modeColor,
                fontSize: 14,
              }}
            >
              Add Note
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
