import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFetchNotesByEntity } from "@shared/api/hooks/notes/useFetchNotesByEntity";
import { usePostNote } from "@shared/api/hooks/notes/usePostNote";
import { usePatchNote } from "@shared/api/hooks/notes/usePatchNote";
import { useDeleteNote } from "@shared/api/hooks/notes/useDeleteNote";
import type { Note } from "@shared/types/Note";
import type { EntityFormType } from "../../lib/store/useEntityFormStore";

type Props = {
  entityType: EntityFormType;
  entityId: number;
  modeId: number;
  entityTitle: string;
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function NoteCard({
  note,
  onEdit,
  onDelete,
}: {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: number) => void;
}) {
  const plainText = stripHtml(note.body);

  return (
    <View
      style={{
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 12, color: "#9ca3af" }}>
          {note.author?.displayName ?? "You"}
          {" \u00b7 "}
          {formatDate(note.created_at)}
        </Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity
            onPress={() => onEdit(note)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="edit-2" size={14} color="#6b7280" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              Alert.alert("Delete Note", "Remove this note?", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => onDelete(note.id),
                },
              ])
            }
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="trash-2" size={14} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>

      <Text
        style={{ fontSize: 15, color: "#111", marginTop: 6, lineHeight: 22 }}
      >
        {plainText || "(empty note)"}
      </Text>
    </View>
  );
}

export default function NotesTab({
  entityType,
  entityId,
  modeId,
  entityTitle,
}: Props) {
  const { data: notes = [], isLoading } = useFetchNotesByEntity(
    entityType,
    entityId
  );
  const postNote = usePostNote();
  const patchNote = usePatchNote();
  const deleteNote = useDeleteNote();

  const [composerOpen, setComposerOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [body, setBody] = useState("");

  const handleOpenComposer = () => {
    setEditingNote(null);
    setBody("");
    setComposerOpen(true);
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setBody(stripHtml(note.body));
    setComposerOpen(true);
  };

  const handleSave = async () => {
    if (!body.trim()) return;

    if (editingNote) {
      await patchNote.mutateAsync({ id: editingNote.id, body: body.trim() });
    } else {
      await postNote.mutateAsync({
        body: body.trim(),
        mode_id: modeId,
        content_type: entityType,
        object_id: entityId,
        entity_title: entityTitle,
      });
    }

    setBody("");
    setComposerOpen(false);
    setEditingNote(null);
  };

  const saving = postNote.isPending || patchNote.isPending;

  if (isLoading) {
    return (
      <View style={{ padding: 20, alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Composer (expanded) */}
      {composerOpen && (
        <View
          style={{
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: "#e5e7eb",
          }}
        >
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Write a note..."
            multiline
            autoFocus
            style={{
              borderWidth: 1,
              borderColor: "#d1d5db",
              borderRadius: 10,
              padding: 12,
              fontSize: 15,
              minHeight: 100,
              textAlignVertical: "top",
            }}
          />
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              marginTop: 8,
              gap: 12,
            }}
          >
            <TouchableOpacity
              onPress={() => {
                setComposerOpen(false);
                setEditingNote(null);
              }}
            >
              <Text style={{ color: "#6b7280", fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} disabled={saving || !body.trim()}>
              {saving ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text
                  style={{
                    color: body.trim() ? "#2563eb" : "#9ca3af",
                    fontSize: 15,
                    fontWeight: "600",
                  }}
                >
                  {editingNote ? "Save" : "Add"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Notes list */}
      <FlatList
        data={notes}
        keyExtractor={(n) => String(n.id)}
        renderItem={({ item }) => (
          <NoteCard
            note={item}
            onEdit={handleEdit}
            onDelete={(id) => deleteNote.mutate(id)}
          />
        )}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 24 }}>
            <Text style={{ color: "#9ca3af" }}>No notes yet</Text>
          </View>
        }
      />

      {/* Add note button */}
      {!composerOpen && (
        <TouchableOpacity
          onPress={handleOpenComposer}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 14,
            borderTopWidth: 1,
            borderTopColor: "#e5e7eb",
            backgroundColor: "#fff",
          }}
        >
          <Feather name="plus" size={18} color="#2563eb" />
          <Text
            style={{
              color: "#2563eb",
              fontWeight: "600",
              fontSize: 15,
              marginLeft: 6,
            }}
          >
            Add Note
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
