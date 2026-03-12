import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useFetchNotesByEntity } from "@shared/api/hooks/notes/useFetchNotesByEntity";
import { usePostNote } from "@shared/api/hooks/notes/usePostNote";
import { usePatchNote } from "@shared/api/hooks/notes/usePatchNote";
import { useDeleteNote } from "@shared/api/hooks/notes/useDeleteNote";
import type { Note } from "@shared/types/Note";
import type { EntityFormType } from "../../lib/store/useEntityFormStore";
import RichNoteBody from "../notes/RichNoteBody";
import FormatToolbar from "../notes/FormatToolbar";

type Props = {
  entityType: EntityFormType;
  entityId: number;
  modeId: number;
  entityTitle: string;
  isCollab?: boolean;
};

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
  showAuthor,
}: {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: number) => void;
  showAuthor: boolean;
}) {
  const authorName = note.author?.displayName || "Me";
  const dateStr = formatDate(note.created_at);

  return (
    <View
      style={{
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
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
      </View>

      {/* Actions */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          marginTop: 6,
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => onEdit(note)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ padding: 4 }}
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
          style={{ padding: 4 }}
        >
          <Feather name="trash-2" size={14} color="#9ca3af" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function NotesTab({
  entityType,
  entityId,
  modeId,
  entityTitle,
  isCollab = false,
}: Props) {
  const insets = useSafeAreaInsets();
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
    const cursorPos = selected
      ? start + tag.length + 2 + selected.length + tag.length + 3
      : start + tag.length + 2 + tag.length + 3;
    setTimeout(() => {
      inputRef.current?.setNativeProps?.({
        selection: { start: cursorPos, end: cursorPos },
      });
    }, 50);
  }, [body]);

  const handleOpenComposer = () => {
    setEditingNote(null);
    setBody("");
    setComposerOpen(true);
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setBody(note.body);
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
          <FormatToolbar
            onBold={() => wrapSelection("b")}
            onItalic={() => wrapSelection("i")}
            onUnderline={() => wrapSelection("u")}
          />
          <TextInput
            ref={inputRef}
            value={body}
            onChangeText={setBody}
            onSelectionChange={(e) => {
              selectionRef.current = e.nativeEvent.selection;
            }}
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
            showAuthor={isCollab}
          />
        )}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}
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
            paddingTop: 14,
            paddingBottom: Math.max(14, insets.bottom),
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
