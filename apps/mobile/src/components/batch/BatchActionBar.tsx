import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { cardShadow, textLine } from "../../lib/styles/platform";
import { useSelectionStore } from "../../lib/store/useSelectionStore";
import { useBatchDelete } from "@shared/api/batch/hooks/useBatchDelete";
import { useBatchComplete } from "@shared/api/batch/hooks/useBatchComplete";
import { useBatchSchedule } from "@shared/api/batch/hooks/useBatchSchedule";
import { useBatchChangeMode } from "@shared/api/batch/hooks/useBatchChangeMode";
import { useModeStore } from "@shared/store/useModeStore";
import type { Mode } from "@shared/types/Mode";

type Props = {
  modeColor: string;
};

const formatDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function BatchActionBar({ modeColor }: Props) {
  const totalCount = useSelectionStore((s) => s.totalCount());
  const clearAll = useSelectionStore((s) => s.clearAll);
  const getSelectedIds = useSelectionStore((s) => s.getSelectedIds);
  const isActive = useSelectionStore((s) => s.isActive);

  const modes = useModeStore((s) => (s as any).modes as Mode[] | undefined) ?? [];

  const batchDelete = useBatchDelete();
  const batchComplete = useBatchComplete();
  const batchSchedule = useBatchSchedule();
  const batchChangeMode = useBatchChangeMode();
  const [busy, setBusy] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  if (!isActive) return null;

  const runAction = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      clearAll();
    } catch {
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const handleSchedule = () => {
    Alert.alert("Schedule", `Set date for ${totalCount} item${totalCount > 1 ? "s" : ""}`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Today",
        onPress: () =>
          runAction(() =>
            batchSchedule.mutateAsync({
              selected: getSelectedIds(),
              dueDate: formatDate(new Date()),
              dueTime: undefined,
            })
          ),
      },
      {
        text: "Pick Date",
        onPress: () => setShowDatePicker(true),
      },
      {
        text: "Clear Date",
        style: "destructive",
        onPress: () =>
          runAction(() =>
            batchSchedule.mutateAsync({
              selected: getSelectedIds(),
              dueDate: null,
              dueTime: null,
            })
          ),
      },
    ]);
  };

  const handleDatePicked = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (date) {
      runAction(() =>
        batchSchedule.mutateAsync({
          selected: getSelectedIds(),
          dueDate: formatDate(date),
          dueTime: undefined,
        })
      );
    }
  };

  const handleMove = () => {
    if (modes.length === 0) return;

    const buttons = modes.map((mode: Mode) => ({
      text: mode.name,
      onPress: () =>
        runAction(() =>
          batchChangeMode.mutateAsync({
            selected: getSelectedIds(),
            modeId: mode.id,
          })
        ),
    }));

    Alert.alert(
      "Move to Mode",
      `Move ${totalCount} item${totalCount > 1 ? "s" : ""} to:`,
      [{ text: "Cancel", style: "cancel" }, ...buttons]
    );
  };

  const handleComplete = () => {
    Alert.alert(
      "Complete Items",
      `Mark ${totalCount} item${totalCount > 1 ? "s" : ""} as complete?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          onPress: () =>
            runAction(() => batchComplete.mutateAsync({ selected: getSelectedIds() })),
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
          onPress: () =>
            runAction(() => batchDelete.mutateAsync({ selected: getSelectedIds() })),
        },
      ]
    );
  };

  const actionBtn = (
    icon: React.ComponentProps<typeof Feather>["name"],
    label: string,
    bg: string,
    fg: string,
    onPress: () => void
  ) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={busy}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: bg,
        gap: 5,
      }}
    >
      <Feather name={icon} size={15} color={fg} />
      <Text style={{ ...textLine(13), fontWeight: "600", color: fg }}>{label}</Text>
    </TouchableOpacity>
  );

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
        paddingVertical: 10,
        ...cardShadow("lg"),
      }}
    >
      {/* Top row: close + count */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          marginBottom: 8,
        }}
      >
        <TouchableOpacity
          onPress={clearAll}
          style={{ marginRight: 12 }}
          disabled={busy}
        >
          <Feather name="x" size={22} color="#6b7280" />
        </TouchableOpacity>

        <Text style={{ flex: 1, ...textLine(15), fontWeight: "600", color: "#111" }}>
          {totalCount} selected
        </Text>

        {busy && <ActivityIndicator size="small" color={modeColor} />}
      </View>

      {/* Action buttons row */}
      {!busy && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {actionBtn("calendar", "Schedule", "#dbeafe", "#1d4ed8", handleSchedule)}
          {actionBtn("arrow-right", "Move", "#e0e7ff", "#4338ca", handleMove)}
          {actionBtn("check", "Done", "#dcfce7", "#166534", handleComplete)}
          {actionBtn("trash-2", "Delete", "#fee2e2", "#dc2626", handleDelete)}
        </ScrollView>
      )}

      {showDatePicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display="default"
          onChange={handleDatePicked}
        />
      )}
    </View>
  );
}
