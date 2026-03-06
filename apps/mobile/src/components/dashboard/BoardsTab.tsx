import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { usePinsByEntity } from "@shared/api/hooks/boards/usePinsByEntity";
import { useCreatePin } from "@shared/api/hooks/boards/useCreatePin";
import { useDeletePin } from "@shared/api/hooks/boards/useDeletePin";
import { textLine } from "../../lib/styles/platform";
import type { EntityFormType } from "../../lib/store/useEntityFormStore";
import type { Pin } from "@shared/types/Pin";

type Props = {
  entityType: EntityFormType;
  entityId: number;
  modeId: number;
  modeColor: string;
};

const COLUMN_COUNT = 2;
const CARD_GAP = 10;
const PADDING = 12;

export default function BoardsTab({ entityType, entityId, modeId, modeColor }: Props) {
  const { data: pins = [], isLoading } = usePinsByEntity(entityType, String(entityId));
  const createPin = useCreatePin();
  const deletePin = useDeletePin();
  const [viewingPin, setViewingPin] = useState<Pin | null>(null);

  const screenWidth = Dimensions.get("window").width;
  const cardWidth = (screenWidth - PADDING * 2 - CARD_GAP * (COLUMN_COUNT - 1)) / COLUMN_COUNT;

  const handleAddImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const uri = asset.uri;
    const filename = uri.split("/").pop() ?? "image.jpg";
    const type = asset.mimeType ?? "image/jpeg";

    const file = {
      uri,
      name: filename,
      type,
    } as unknown as File;

    try {
      await createPin.mutateAsync({
        kind: "image",
        modeId,
        entity: entityType,
        entityId,
        file,
      });
    } catch {
      Alert.alert("Error", "Failed to upload image.");
    }
  };

  const handleDeletePin = (pin: Pin) => {
    Alert.alert("Delete Pin", `Delete "${pin.title || "this pin"}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deletePin.mutate(pin.id),
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (pins.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 40 }}>
        <TouchableOpacity
          onPress={handleAddImage}
          disabled={createPin.isPending}
          style={{
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: "#d1d5db",
            borderRadius: 8,
            paddingVertical: 24,
            paddingHorizontal: 32,
            alignItems: "center",
          }}
        >
          {createPin.isPending ? (
            <ActivityIndicator size="small" color={modeColor} />
          ) : (
            <>
              <Feather name="plus" size={24} color="#9ca3af" />
              <Text style={{ ...textLine(14), color: "#9ca3af", fontStyle: "italic", marginTop: 8 }}>
                Add a pin
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  const dataWithAdd = [...pins, { id: -1 } as Pin];

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={dataWithAdd}
        numColumns={COLUMN_COUNT}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: PADDING, paddingBottom: 40 }}
        columnWrapperStyle={{ gap: CARD_GAP }}
        renderItem={({ item }) => {
          // Add button card
          if (item.id === -1) {
            return (
              <TouchableOpacity
                onPress={handleAddImage}
                disabled={createPin.isPending}
                style={{
                  width: cardWidth,
                  height: cardWidth,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: "#d1d5db",
                  borderRadius: 8,
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: CARD_GAP,
                }}
              >
                {createPin.isPending ? (
                  <ActivityIndicator size="small" color={modeColor} />
                ) : (
                  <Feather name="plus" size={24} color="#9ca3af" />
                )}
              </TouchableOpacity>
            );
          }

          const hasImage = item.kind === "image" && (item.file || item.thumbnail);
          const imageUrl = item.thumbnail || item.file;

          return (
            <TouchableOpacity
              onPress={() => setViewingPin(item)}
              onLongPress={() => handleDeletePin(item)}
              activeOpacity={0.8}
              style={{
                width: cardWidth,
                height: cardWidth,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "#e5e7eb",
                overflow: "hidden",
                marginBottom: CARD_GAP,
                backgroundColor: "#f9fafb",
              }}
            >
              {hasImage && imageUrl ? (
                <Image
                  source={{ uri: imageUrl }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              ) : (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                  <Feather
                    name={item.kind === "link" ? "link" : item.kind === "video" ? "video" : "file"}
                    size={24}
                    color="#9ca3af"
                  />
                  {item.title && (
                    <Text
                      numberOfLines={2}
                      style={{ ...textLine(12), color: "#6b7280", marginTop: 6, textAlign: "center", paddingHorizontal: 8 }}
                    >
                      {item.title}
                    </Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      {/* Full-screen image viewer */}
      <Modal visible={!!viewingPin} transparent animationType="fade" onRequestClose={() => setViewingPin(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => setViewingPin(null)}
            style={{ position: "absolute", top: 50, right: 20, zIndex: 10, padding: 8 }}
          >
            <Feather name="x" size={28} color="#fff" />
          </TouchableOpacity>

          {viewingPin?.kind === "image" && (viewingPin.file || viewingPin.thumbnail) ? (
            <Image
              source={{ uri: viewingPin.file || viewingPin.thumbnail! }}
              style={{ width: "90%", height: "70%" }}
              resizeMode="contain"
            />
          ) : (
            <View style={{ alignItems: "center" }}>
              <Feather name="file" size={48} color="#fff" />
              <Text style={{ color: "#fff", marginTop: 12, fontSize: 16 }}>
                {viewingPin?.title || "Pin"}
              </Text>
            </View>
          )}

          {viewingPin && (
            <TouchableOpacity
              onPress={() => {
                handleDeletePin(viewingPin);
                setViewingPin(null);
              }}
              style={{
                position: "absolute",
                bottom: 50,
                paddingHorizontal: 20,
                paddingVertical: 10,
                backgroundColor: "#dc2626",
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </Modal>
    </View>
  );
}
