import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSelectionStore } from "../../lib/store/useSelectionStore";
import { useBatchDelete } from "@shared/api/batch/hooks/useBatchDelete";
import { useBatchComplete } from "@shared/api/batch/hooks/useBatchComplete";

type Props = {
  modeColor: string;
};

export default function BatchActionBar({ modeColor }: Props) {
  const totalCount = useSelectionStore((s) => s.totalCount());
  const clearAll = useSelectionStore((s) => s.clearAll);
  const getSelectedIds = useSelectionStore((s) => s.getSelectedIds);
  const isActive = useSelectionStore((s) => s.isActive);

  const batchDelete = useBatchDelete();
  const batchComplete = useBatchComplete();
  const [busy, setBusy] = useState(false);

  if (!isActive) return null;

  const handleComplete = () => {
    Alert.alert(
      "Complete Items",
      `Mark ${totalCount} item${totalCount > 1 ? "s" : ""} as complete?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          onPress: async () => {
            setBusy(true);
            try {
              await batchComplete.mutateAsync({ selected: getSelectedIds() });
              clearAll();
            } catch {
              Alert.alert("Error", "Failed to complete items.");
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Items",
      `Delete ${totalCount} item${totalCount > 1 ? "s" : ""}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await batchDelete.mutateAsync({ selected: getSelectedIds() });
              clearAll();
            } catch {
              Alert.alert("Error", "Failed to delete items.");
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#e5e7eb",
        paddingHorizontal: 16,
        paddingVertical: 12,
        elevation: 8,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: -2 },
      }}
    >
      {/* Close selection */}
      <TouchableOpacity
        onPress={clearAll}
        style={{ marginRight: 12 }}
        disabled={busy}
      >
        <Feather name="x" size={22} color="#6b7280" />
      </TouchableOpacity>

      {/* Count */}
      <Text style={{ flex: 1, fontSize: 15, fontWeight: "600", color: "#111" }}>
        {totalCount} selected
      </Text>

      {busy ? (
        <ActivityIndicator size="small" color={modeColor} />
      ) : (
        <View style={{ flexDirection: "row", gap: 12 }}>
          {/* Complete */}
          <TouchableOpacity
            onPress={handleComplete}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: "#dcfce7",
              gap: 6,
            }}
          >
            <Feather name="check" size={16} color="#166534" />
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#166534" }}>
              Done
            </Text>
          </TouchableOpacity>

          {/* Delete */}
          <TouchableOpacity
            onPress={handleDelete}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: "#fee2e2",
              gap: 6,
            }}
          >
            <Feather name="trash-2" size={16} color="#dc2626" />
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#dc2626" }}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
