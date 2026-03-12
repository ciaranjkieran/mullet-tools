import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useWhiteNavBar } from "../../lib/hooks/useWhiteNavBar";
import { Feather } from "@expo/vector-icons";
import { useModeStore } from "@shared/store/useModeStore";
import { useCreateMode } from "@shared/api/hooks/modes/useCreateMode";
import { useUpdateMode } from "@shared/api/hooks/modes/useUpdateMode";
import { useDeleteMode } from "@shared/api/hooks/modes/useDeleteMode";
import {
  useReorderModes,
  buildFullModeReorder,
} from "@shared/api/hooks/modes/useReorderModes";
import type { Mode } from "@shared/types/Mode";

type Props = {
  visible: boolean;
  onClose: () => void;
};

type EditableMode = {
  id: number | string; // string for temp IDs
  title: string;
  color: string;
  isNew?: boolean;
};

const PRESET_COLORS = [
  "#3B82F6",
  "#8B5CF6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#14B8A6",
  "#64748B",
  "#F97316",
  "#6366F1",
];

export default function EditModesModal({ visible, onClose }: Props) {
  useWhiteNavBar(visible);
  const modes = useModeStore((s) => s.modes);
  const createMode = useCreateMode();
  const updateMode = useUpdateMode();
  const deleteMode = useDeleteMode();
  const reorderModes = useReorderModes();

  const [editModes, setEditModes] = useState<EditableMode[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletedIds, setDeletedIds] = useState<number[]>([]);

  // Initialize from real modes when modal opens
  useEffect(() => {
    if (visible) {
      setEditModes(
        modes
          .filter((m) => m.isOwned)
          .map((m) => ({ id: m.id, title: m.title, color: m.color }))
      );
      setDeletedIds([]);
    }
  }, [visible, modes]);

  const addMode = () => {
    setEditModes((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        title: "",
        color: PRESET_COLORS[prev.length % PRESET_COLORS.length],
        isNew: true,
      },
    ]);
  };

  const removeMode = (index: number) => {
    const mode = editModes[index];
    if (typeof mode.id === "number") {
      Alert.alert(
        "Delete Mode",
        `Delete "${mode.title || "Untitled"}"? All entities in this mode will be deleted.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              setDeletedIds((prev) => [...prev, mode.id as number]);
              setEditModes((prev) => prev.filter((_, i) => i !== index));
            },
          },
        ]
      );
    } else {
      setEditModes((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const updateTitle = (index: number, title: string) => {
    setEditModes((prev) =>
      prev.map((m, i) => (i === index ? { ...m, title } : m))
    );
  };

  const updateColor = (index: number, color: string) => {
    setEditModes((prev) =>
      prev.map((m, i) => (i === index ? { ...m, color } : m))
    );
  };

  const moveMode = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= editModes.length) return;
    setEditModes((prev) => {
      const next = [...prev];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
  };

  const handleSave = async () => {
    // Validate
    const hasEmpty = editModes.some((m) => !m.title.trim());
    if (hasEmpty) {
      Alert.alert("Error", "All modes must have a title.");
      return;
    }

    setSaving(true);
    try {
      // 1. Delete removed modes
      for (const id of deletedIds) {
        await deleteMode.mutateAsync(id);
      }

      // 2. Create new modes
      const idMap = new Map<string, number>();
      for (let i = 0; i < editModes.length; i++) {
        const m = editModes[i];
        if (typeof m.id === "string") {
          const result = await createMode.mutateAsync({
            title: m.title.trim(),
            color: m.color,
            position: i,
          });
          idMap.set(m.id, result.id);
        }
      }

      // 3. Update existing modes (title/color changes)
      const original = new Map(modes.map((m) => [m.id, m]));
      for (const m of editModes) {
        if (typeof m.id === "number") {
          const orig = original.get(m.id);
          if (orig && (orig.title !== m.title.trim() || orig.color !== m.color)) {
            await updateMode.mutateAsync({
              id: m.id,
              title: m.title.trim(),
              color: m.color,
            });
          }
        }
      }

      // 4. Reorder
      const realModes: Mode[] = editModes.map((m, i) => ({
        id: typeof m.id === "number" ? m.id : idMap.get(m.id) ?? 0,
        title: m.title,
        color: m.color,
        position: i,
        isOwned: true,
        collaboratorCount: 0,
        ownerName: null,
      }));
      await reorderModes.mutateAsync(buildFullModeReorder(realModes));

      onClose();
    } catch {
      Alert.alert("Error", "Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header */}
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
          <TouchableOpacity onPress={onClose} disabled={saving}>
            <Text style={{ color: "#6b7280", fontSize: 16 }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: "600" }}>Edit Modes</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text
                style={{ color: "#2563eb", fontSize: 16, fontWeight: "600" }}
              >
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) }}
          keyboardShouldPersistTaps="handled"
        >
          {editModes.map((mode, index) => (
            <View
              key={mode.id}
              style={{
                borderWidth: 1,
                borderColor: "#e5e7eb",
                borderRadius: 12,
                padding: 12,
                marginBottom: 12,
              }}
            >
              {/* Title + delete */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: mode.color,
                    marginRight: 10,
                  }}
                />
                <TextInput
                  value={mode.title}
                  onChangeText={(t) => updateTitle(index, t)}
                  placeholder="Mode name"
                  style={{
                    flex: 1,
                    fontSize: 16,
                    fontWeight: "500",
                    padding: 0,
                    color: "#111",
                  }}
                />
                <TouchableOpacity
                  onPress={() => removeMode(index)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ marginLeft: 8 }}
                >
                  <Feather name="trash-2" size={18} color="#dc2626" />
                </TouchableOpacity>
              </View>

              {/* Color picker */}
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                {PRESET_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => updateColor(index, c)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: c,
                      borderWidth: mode.color === c ? 3 : 0,
                      borderColor: "#111",
                    }}
                  />
                ))}
              </View>

              {/* Reorder */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  gap: 12,
                }}
              >
                <TouchableOpacity
                  onPress={() => moveMode(index, -1)}
                  disabled={index === 0}
                  style={{ opacity: index === 0 ? 0.3 : 1 }}
                >
                  <Feather name="arrow-up" size={18} color="#6b7280" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => moveMode(index, 1)}
                  disabled={index === editModes.length - 1}
                  style={{
                    opacity: index === editModes.length - 1 ? 0.3 : 1,
                  }}
                >
                  <Feather name="arrow-down" size={18} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Add mode */}
          <TouchableOpacity
            onPress={addMode}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 14,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "#d1d5db",
              borderStyle: "dashed",
              gap: 8,
            }}
          >
            <Feather name="plus" size={18} color="#6b7280" />
            <Text style={{ color: "#6b7280", fontSize: 15, fontWeight: "500" }}>
              Add Mode
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
