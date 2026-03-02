import React, { useState, type ReactElement } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { useFetchNotesByMode } from "@shared/api/hooks/notes/useFetchNotesByMode";
import { usePostNote } from "@shared/api/hooks/notes/usePostNote";
import { useDeleteNote } from "@shared/api/hooks/notes/useDeleteNote";
import type { Note } from "@shared/types/Note";
import type { Mode } from "@shared/types/Mode";

type Props = {
  modes: Mode[];
  selectedMode: Mode | "All";
  listHeader?: ReactElement;
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function NoteCard({
  note,
  onDelete,
}: {
  note: Note;
  onDelete: () => void;
}) {
  const authorName = note.author?.displayName || note.author?.email || "You";
  const dateStr = format(parseISO(note.created_at), "MMM d, h:mm a");
  const bodyText = stripHtml(note.body);
  const entityLabel = note.entityTitle || note.display_title || null;

  return (
    <View
      style={{
        marginHorizontal: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 12,
        padding: 14,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
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
          <Text style={{ fontSize: 11, fontWeight: "600", color: "#4338ca" }}>
            {authorName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={{ fontSize: 13, fontWeight: "600", color: "#111", flex: 1 }}>
          {authorName}
        </Text>
        <Text style={{ fontSize: 11, color: "#9ca3af" }}>{dateStr}</Text>
      </View>

      {entityLabel && (
        <View
          style={{
            backgroundColor: "#f3f4f6",
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 4,
            alignSelf: "flex-start",
            marginBottom: 6,
          }}
        >
          <Text style={{ fontSize: 11, color: "#6b7280" }}>
            {note.content_type}: {entityLabel}
          </Text>
        </View>
      )}

      <Text
        style={{ fontSize: 14, color: "#374151", lineHeight: 20 }}
        numberOfLines={6}
      >
        {bodyText || "(empty note)"}
      </Text>

      <TouchableOpacity
        onPress={onDelete}
        style={{ alignSelf: "flex-end", marginTop: 8, padding: 4 }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="trash-2" size={14} color="#9ca3af" />
      </TouchableOpacity>
    </View>
  );
}

export default function ModeNotesView({ modes, selectedMode, listHeader }: Props) {
  const modeId =
    selectedMode === "All" ? 0 : (selectedMode as Mode).id;
  const modeColor =
    selectedMode === "All" ? "#000" : (selectedMode as Mode).color;

  const { data: notes = [], isLoading } = useFetchNotesByMode(modeId);
  const postNote = usePostNote();
  const deleteNote = useDeleteNote();
  const [body, setBody] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);

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

  if (selectedMode === "All") {
    return (
      <View style={{ flex: 1 }}>
        {listHeader}
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 80 }}>
          <Feather name="edit" size={40} color="#d1d5db" />
          <Text style={{ color: "#9ca3af", fontSize: 16, marginTop: 12 }}>
            Select a mode to view notes
          </Text>
        </View>
      </View>
    );
  }

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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={160}
    >
      <FlatList
        data={notes}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <NoteCard note={item} onDelete={() => handleDelete(item.id)} />
        )}
        ListHeaderComponent={listHeader}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 100, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 80 }}>
            <Feather name="edit" size={40} color="#d1d5db" />
            <Text style={{ color: "#9ca3af", fontSize: 16, marginTop: 12 }}>
              No notes yet
            </Text>
            <Text style={{ color: "#d1d5db", fontSize: 13, marginTop: 4 }}>
              Add a note to get started
            </Text>
          </View>
        }
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
            <TextInput
              value={body}
              onChangeText={setBody}
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
