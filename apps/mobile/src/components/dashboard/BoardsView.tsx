import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  Alert,
  Linking,
  ActivityIndicator,
  Dimensions,
  Modal,
  TextInput,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { usePinsByMode } from "@shared/api/hooks/boards/usePinsByMode";
import { useCreatePin } from "@shared/api/hooks/boards/useCreatePin";
import { useDeletePin } from "@shared/api/hooks/boards/useDeletePin";
import type { Pin, PinKind } from "@shared/types/Pin";

type Props = {
  modeId: number;
  modeColor: string;
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const COLUMN_GAP = 8;
const PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - PADDING * 2 - COLUMN_GAP) / 2;

function PinCard({
  pin,
  onDelete,
}: {
  pin: Pin;
  onDelete: (id: number) => void;
}) {
  const handlePress = () => {
    if (pin.url) Linking.openURL(pin.url);
    else if (pin.file) Linking.openURL(pin.file);
  };

  const handleDelete = () => {
    Alert.alert("Delete Pin", `Remove "${pin.title || "this pin"}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDelete(pin.id),
      },
    ]);
  };

  const imageUri = pin.thumbnail || pin.file;
  const isImage = pin.kind === "image" && imageUri;
  const isLink = pin.kind === "link";

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={handleDelete}
      activeOpacity={0.7}
      style={{
        width: CARD_WIDTH,
        backgroundColor: "#f9fafb",
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: COLUMN_GAP,
        borderWidth: 1,
        borderColor: "#e5e7eb",
      }}
    >
      {isImage && (
        <Image
          source={{ uri: imageUri }}
          style={{ width: CARD_WIDTH, height: CARD_WIDTH * 0.75 }}
          resizeMode="cover"
        />
      )}

      {isLink && !imageUri && (
        <View
          style={{
            width: CARD_WIDTH,
            height: 60,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#f3f4f6",
          }}
        >
          <Feather name="link" size={24} color="#9ca3af" />
        </View>
      )}

      {pin.kind === "file" && !imageUri && (
        <View
          style={{
            width: CARD_WIDTH,
            height: 60,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#f3f4f6",
          }}
        >
          <Feather name="file" size={24} color="#9ca3af" />
        </View>
      )}

      {pin.kind === "video" && (
        <View
          style={{
            width: CARD_WIDTH,
            height: 60,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#1f2937",
          }}
        >
          <Feather name="play" size={24} color="#fff" />
        </View>
      )}

      <View style={{ padding: 8 }}>
        <Text
          numberOfLines={2}
          style={{ fontSize: 13, fontWeight: "500", color: "#111" }}
        >
          {pin.title || pin.display_title || pin.url || "Untitled"}
        </Text>
        {pin.kind !== "image" && (
          <Text
            style={{
              fontSize: 11,
              color: "#9ca3af",
              marginTop: 2,
              textTransform: "uppercase",
            }}
          >
            {pin.kind}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Create Pin Modal ─────────────────────────────────────

function CreatePinModal({
  visible,
  onClose,
  modeId,
  modeColor,
}: {
  visible: boolean;
  onClose: () => void;
  modeId: number;
  modeColor: string;
}) {
  const createPin = useCreatePin();
  const [kind, setKind] = useState<PinKind>("image");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<{
    uri: string;
    name: string;
    type: string;
  } | null>(null);

  const resetForm = () => {
    setKind("image");
    setTitle("");
    setUrl("");
    setFile(null);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: kind === "video" ? ["videos"] : ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setFile({
        uri: asset.uri,
        name: asset.fileName ?? `pick_${Date.now()}.jpg`,
        type: asset.mimeType ?? "image/jpeg",
      });
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({});
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setFile({
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType ?? "application/octet-stream",
      });
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera access is required.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setFile({
        uri: asset.uri,
        name: asset.fileName ?? `photo_${Date.now()}.jpg`,
        type: asset.mimeType ?? "image/jpeg",
      });
    }
  };

  const handleCreate = async () => {
    const payload: any = {
      kind,
      modeId,
      entity: "mode",
      entityId: modeId,
      title: title.trim() || undefined,
    };

    if (kind === "link") {
      if (!url.trim()) return;
      payload.url = url.trim();
    } else {
      if (!file) return;
      payload.file = file;
    }

    await createPin.mutateAsync(payload);
    resetForm();
    onClose();
  };

  const canSubmit =
    kind === "link" ? !!url.trim() : !!file;

  const KINDS: { value: PinKind; label: string; icon: keyof typeof Feather.glyphMap }[] = [
    { value: "image", label: "Image", icon: "image" },
    { value: "link", label: "Link", icon: "link" },
    { value: "file", label: "File", icon: "file" },
    { value: "video", label: "Video", icon: "video" },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: "#fff" }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: "#e5e7eb",
          }}
        >
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: "#6b7280", fontSize: 16 }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: "600" }}>New Pin</Text>
          <TouchableOpacity
            onPress={handleCreate}
            disabled={createPin.isPending || !canSubmit}
          >
            {createPin.isPending ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text
                style={{
                  color: canSubmit ? "#2563eb" : "#9ca3af",
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                Add
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Kind selector */}
          <View
            style={{
              flexDirection: "row",
              backgroundColor: "#f3f4f6",
              borderRadius: 12,
              padding: 4,
              marginBottom: 16,
            }}
          >
            {KINDS.map((k) => (
              <TouchableOpacity
                key={k.value}
                onPress={() => {
                  setKind(k.value);
                  setFile(null);
                  setUrl("");
                }}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor:
                    kind === k.value ? "#fff" : "transparent",
                  gap: 4,
                }}
              >
                <Feather name={k.icon} size={14} color="#374151" />
                <Text style={{ fontSize: 12, fontWeight: "500" }}>
                  {k.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Title */}
          <Text style={formLabel}>Title (optional)</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Pin title"
            style={formInput}
          />

          {/* URL (links) */}
          {kind === "link" && (
            <>
              <Text style={formLabel}>URL</Text>
              <TextInput
                value={url}
                onChangeText={setUrl}
                placeholder="https://..."
                keyboardType="url"
                autoCapitalize="none"
                style={formInput}
              />
            </>
          )}

          {/* File picker */}
          {kind !== "link" && (
            <>
              <Text style={formLabel}>File</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                {kind === "image" && (
                  <>
                    <TouchableOpacity onPress={takePhoto} style={pickerBtn}>
                      <Feather name="camera" size={18} color="#374151" />
                      <Text style={pickerBtnText}>Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={pickImage} style={pickerBtn}>
                      <Feather name="image" size={18} color="#374151" />
                      <Text style={pickerBtnText}>Gallery</Text>
                    </TouchableOpacity>
                  </>
                )}
                {kind === "video" && (
                  <TouchableOpacity onPress={pickImage} style={pickerBtn}>
                    <Feather name="video" size={18} color="#374151" />
                    <Text style={pickerBtnText}>Pick Video</Text>
                  </TouchableOpacity>
                )}
                {kind === "file" && (
                  <TouchableOpacity onPress={pickDocument} style={pickerBtn}>
                    <Feather name="file" size={18} color="#374151" />
                    <Text style={pickerBtnText}>Browse</Text>
                  </TouchableOpacity>
                )}
              </View>

              {file && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#f3f4f6",
                    padding: 10,
                    borderRadius: 8,
                    marginBottom: 12,
                  }}
                >
                  {kind === "image" && (
                    <Image
                      source={{ uri: file.uri }}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 6,
                        marginRight: 10,
                      }}
                    />
                  )}
                  <Text
                    numberOfLines={1}
                    style={{ flex: 1, fontSize: 13, color: "#374151" }}
                  >
                    {file.name}
                  </Text>
                  <TouchableOpacity onPress={() => setFile(null)}>
                    <Feather name="x" size={16} color="#6b7280" />
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main Boards View ─────────────────────────────────────

export default function BoardsView({ modeId, modeColor }: Props) {
  const { data: pins = [], isLoading } = usePinsByMode(modeId);
  const deletePin = useDeletePin();
  const [createVisible, setCreateVisible] = useState(false);

  const handleDelete = useCallback(
    (pinId: number) => {
      deletePin.mutate(pinId);
    },
    [deletePin]
  );

  if (isLoading) {
    return (
      <View style={{ padding: 20, alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={pins}
        numColumns={2}
        keyExtractor={(p) => String(p.id)}
        renderItem={({ item }) => (
          <PinCard pin={item} onDelete={handleDelete} />
        )}
        columnWrapperStyle={{
          justifyContent: "space-between",
          paddingHorizontal: PADDING,
        }}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 80 }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 32 }}>
            <Feather name="image" size={32} color="#d1d5db" />
            <Text style={{ color: "#9ca3af", marginTop: 8 }}>
              No pins yet
            </Text>
          </View>
        }
      />

      {/* Add pin FAB */}
      <TouchableOpacity
        onPress={() => setCreateVisible(true)}
        activeOpacity={0.8}
        style={{
          position: "absolute",
          bottom: 24,
          right: 24,
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: modeColor,
          justifyContent: "center",
          alignItems: "center",
          elevation: 4,
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
        }}
      >
        <Feather name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      <CreatePinModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        modeId={modeId}
        modeColor={modeColor}
      />
    </View>
  );
}

// ── Shared styles ──────────────────────────────────────────

const formLabel = {
  fontSize: 13 as const,
  fontWeight: "600" as const,
  color: "#374151",
  marginBottom: 6,
  marginTop: 16,
};

const formInput = {
  borderWidth: 1,
  borderColor: "#d1d5db",
  borderRadius: 10,
  padding: 12,
  fontSize: 16 as const,
  backgroundColor: "#fff",
};

const pickerBtn = {
  flex: 1 as const,
  flexDirection: "row" as const,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  paddingVertical: 12,
  backgroundColor: "#f3f4f6",
  borderRadius: 10,
  borderWidth: 1,
  borderColor: "#e5e7eb",
  gap: 6,
};

const pickerBtnText = {
  fontSize: 14 as const,
  fontWeight: "500" as const,
  color: "#374151",
};
