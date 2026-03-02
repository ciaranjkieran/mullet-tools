import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useCommentsByEntity } from "@shared/api/hooks/comments/useCommentsByEntity";
import { usePostComment } from "@shared/api/hooks/comments/usePostComment";
import { useDeleteComment } from "@shared/api/hooks/comments/useDeleteComment";
import type { Comment, CommentAttachment } from "@shared/types/Comment";
import type { EntityFormType } from "../../lib/store/useEntityFormStore";

type Props = {
  entityType: EntityFormType;
  entityId: number;
  modeId: number;
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

function AttachmentView({ att }: { att: CommentAttachment }) {
  const isImage = att.mime?.startsWith("image/");

  if (isImage) {
    return (
      <TouchableOpacity onPress={() => Linking.openURL(att.url)}>
        <Image
          source={{ uri: att.url }}
          style={{
            width: 200,
            height: 150,
            borderRadius: 8,
            marginTop: 8,
            backgroundColor: "#f3f4f6",
          }}
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={() => Linking.openURL(att.url)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginTop: 8,
        padding: 8,
        backgroundColor: "#f3f4f6",
        borderRadius: 8,
      }}
    >
      <Feather name="paperclip" size={14} color="#6b7280" />
      <Text
        numberOfLines={1}
        style={{ marginLeft: 6, color: "#2563eb", fontSize: 13 }}
      >
        {att.original_name}
      </Text>
    </TouchableOpacity>
  );
}

function CommentCard({
  comment,
  onDelete,
}: {
  comment: Comment;
  onDelete: (id: number) => void;
}) {
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
          {comment.author?.displayName ?? "You"}
          {" \u00b7 "}
          {formatDate(comment.created_at)}
        </Text>
        <TouchableOpacity
          onPress={() =>
            Alert.alert("Delete Comment", "Remove this comment?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => onDelete(comment.id),
              },
            ])
          }
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="trash-2" size={14} color="#dc2626" />
        </TouchableOpacity>
      </View>

      {!!comment.body && (
        <Text style={{ fontSize: 15, color: "#111", marginTop: 4 }}>
          {comment.body}
        </Text>
      )}

      {comment.attachments?.map((att) => (
        <AttachmentView key={att.id} att={att} />
      ))}
    </View>
  );
}

export default function CommentsTab({ entityType, entityId, modeId }: Props) {
  const { data: comments = [], isLoading } = useCommentsByEntity(
    entityType,
    entityId
  );
  const postComment = usePostComment();
  const deleteComment = useDeleteComment();

  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<ImagePicker.ImagePickerAsset[]>(
    []
  );

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setAttachments((prev) => [...prev, ...result.assets]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera access is required to take photos.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled) {
      setAttachments((prev) => [...prev, ...result.assets]);
    }
  };

  const handlePost = async () => {
    if (!body.trim() && attachments.length === 0) return;

    const files: any[] = attachments.map((asset) => ({
      uri: asset.uri,
      name: asset.fileName ?? `photo_${Date.now()}.jpg`,
      type: asset.mimeType ?? "image/jpeg",
    }));

    await postComment.mutateAsync({
      entity: entityType,
      entityId,
      modeId,
      body: body.trim(),
      files,
    });

    setBody("");
    setAttachments([]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <View style={{ padding: 20, alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Comments list */}
      <FlatList
        data={comments}
        keyExtractor={(c) => String(c.id)}
        renderItem={({ item }) => (
          <CommentCard
            comment={item}
            onDelete={(id) => deleteComment.mutate(id)}
          />
        )}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 24 }}>
            <Text style={{ color: "#9ca3af" }}>No comments yet</Text>
          </View>
        }
      />

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 16,
            paddingVertical: 8,
            gap: 8,
          }}
        >
          {attachments.map((asset, i) => (
            <View key={i} style={{ position: "relative" }}>
              <Image
                source={{ uri: asset.uri }}
                style={{ width: 56, height: 56, borderRadius: 8 }}
              />
              <TouchableOpacity
                onPress={() => removeAttachment(i)}
                style={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  backgroundColor: "#dc2626",
                  borderRadius: 10,
                  width: 20,
                  height: 20,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="x" size={12} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Composer */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
          backgroundColor: "#fff",
        }}
      >
        <TouchableOpacity
          onPress={takePhoto}
          style={{ padding: 8, marginRight: 4 }}
        >
          <Feather name="camera" size={20} color="#6b7280" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={pickImage}
          style={{ padding: 8, marginRight: 4 }}
        >
          <Feather name="image" size={20} color="#6b7280" />
        </TouchableOpacity>

        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Add a comment..."
          multiline
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: "#d1d5db",
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
            fontSize: 15,
            maxHeight: 100,
          }}
        />

        <TouchableOpacity
          onPress={handlePost}
          disabled={
            postComment.isPending ||
            (!body.trim() && attachments.length === 0)
          }
          style={{ padding: 8, marginLeft: 4 }}
        >
          {postComment.isPending ? (
            <ActivityIndicator size="small" />
          ) : (
            <Feather
              name="send"
              size={20}
              color={
                body.trim() || attachments.length > 0 ? "#2563eb" : "#d1d5db"
              }
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
