import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { cardShadow, textLine } from "../../lib/styles/platform";
import { useSelectionStore } from "../../lib/store/useSelectionStore";
import BatchEditorModal from "./BatchEditorModal";

type Props = {
  modeColor: string;
};

export default function BatchActionBar({ modeColor }: Props) {
  const totalCount = useSelectionStore((s) => s.totalCount());
  const clearAll = useSelectionStore((s) => s.clearAll);
  const isActive = useSelectionStore((s) => s.isActive);
  const [showEditor, setShowEditor] = useState(false);

  if (!isActive) return null;

  return (
    <View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#e5e7eb",
        paddingVertical: 12,
        paddingHorizontal: 16,
        ...cardShadow("lg"),
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          onPress={clearAll}
          style={{ marginRight: 12 }}
        >
          <Feather name="x" size={22} color="#6b7280" />
        </TouchableOpacity>

        <Text style={{ flex: 1, ...textLine(15), fontWeight: "600", color: "#111" }}>
          {totalCount} selected
        </Text>

        <TouchableOpacity
          onPress={() => setShowEditor(true)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: modeColor || "#2563eb",
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
            gap: 6,
          }}
        >
          <Feather name="edit-2" size={14} color="#fff" />
          <Text style={{ ...textLine(14), fontWeight: "600", color: "#fff" }}>
            Batch Edit
          </Text>
        </TouchableOpacity>
      </View>

      <BatchEditorModal
        visible={showEditor}
        onClose={() => setShowEditor(false)}
      />
    </View>
  );
}
