import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { useFetchNotesByMode } from "@shared/api/hooks/notes/useFetchNotesByMode";
import { useDeleteNote } from "@shared/api/hooks/notes/useDeleteNote";
import type { Note } from "@shared/types/Note";
import type { Mode } from "@shared/types/Mode";
import type { Goal } from "@shared/types/Goal";
import type { Project } from "@shared/types/Project";
import type { Milestone } from "@shared/types/Milestone";
import type { Task } from "@shared/types/Task";
import { getEntityBreadcrumbFromNote } from "@shared/utils/getEntityBreadcrumbFromNote";
import type { Maps } from "@shared/utils/getEntityBreadcrumb";
import RichNoteBody from "../notes/RichNoteBody";


type Props = {
  mode: Mode;
  goals: Goal[];
  projects: Project[];
  milestones: Milestone[];
  tasks: Task[];
};

/* ── Note card ── */

function NoteCard({
  note,
  onDelete,
  showAuthor,
  breadcrumb,
}: {
  note: Note;
  onDelete: () => void;
  showAuthor: boolean;
  breadcrumb: string;
}) {
  const authorName = note.author?.displayName || "Me";
  const dateStr = format(parseISO(note.created_at), "PPP p");
  const displayTitle = note.display_title || note.entityTitle || "";
  const isModeNote = (note.content_type ?? "").toLowerCase().includes("mode");

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 10,
        padding: 14,
        marginBottom: 10,
        backgroundColor: "#fafafa",
      }}
    >
      <View style={{ marginBottom: 8 }}>
        <RichNoteBody html={note.body} />
      </View>

      <View style={{ borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 8 }}>
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

/* ── Section component ── */

export default function AllModeNoteSection({
  mode,
  goals,
  projects,
  milestones,
  tasks,
}: Props) {
  const { data: notes = [], isLoading } = useFetchNotesByMode(mode.id);
  const deleteNote = useDeleteNote();
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

  if (!isLoading && notes.length === 0) return null;

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

      <View style={{ paddingHorizontal: 20 }}>
        {notes.map((note) => {
          const breadcrumb = getEntityBreadcrumbFromNote(note, maps, { immediateOnly: true });
          return (
            <NoteCard
              key={note.id}
              note={note}
              onDelete={() => deleteNote.mutate(note.id)}
              showAuthor={isCollab}
              breadcrumb={breadcrumb}
            />
          );
        })}
      </View>
    </View>
  );
}
