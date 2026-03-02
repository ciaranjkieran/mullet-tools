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
import { useCommentsByMode } from "@shared/api/hooks/comments/useCommentsByMode";
import { usePostComment } from "@shared/api/hooks/comments/usePostComment";
import type { Comment } from "@shared/types/Comment";
import type { Mode } from "@shared/types/Mode";

type Props = {
  modes: Mode[];
  selectedMode: Mode | "All";
  listHeader?: ReactElement;
};

function CommentCard({ comment }: { comment: Comment }) {
  const authorName = comment.author?.displayName || comment.author?.email || "You";
  const dateStr = format(parseISO(comment.created_at), "MMM d, h:mm a");
  const entityLabel = comment.entity_title
    ? `${comment.entity_model ?? "entity"}: ${comment.entity_title}`
    : null;

  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 4,
        }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: "#e0e7ff",
            justifyContent: "center",
            alignItems: "center",
            marginRight: 8,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "600", color: "#4338ca" }}>
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
          <Text style={{ fontSize: 11, color: "#6b7280" }}>{entityLabel}</Text>
        </View>
      )}

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

export default function ModeCommentsView({ modes, selectedMode, listHeader }: Props) {
  const modeId =
    selectedMode === "All" ? 0 : (selectedMode as Mode).id;
  const modeColor =
    selectedMode === "All" ? "#000" : (selectedMode as Mode).color;

  const { data: comments = [], isLoading } = useCommentsByMode(modeId);
  const postComment = usePostComment();
  const [body, setBody] = useState("");

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

  if (selectedMode === "All") {
    return (
      <View style={{ flex: 1 }}>
        {listHeader}
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 80 }}>
          <Feather name="message-square" size={40} color="#d1d5db" />
          <Text style={{ color: "#9ca3af", fontSize: 16, marginTop: 12 }}>
            Select a mode to view comments
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
        data={comments.filter((c) => !c.is_deleted)}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <CommentCard comment={item} />}
        ListHeaderComponent={listHeader}
        contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 80 }}>
            <Feather name="message-square" size={40} color="#d1d5db" />
            <Text style={{ color: "#9ca3af", fontSize: 16, marginTop: 12 }}>
              No comments yet
            </Text>
            <Text style={{ color: "#d1d5db", fontSize: 13, marginTop: 4 }}>
              Start a conversation
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
