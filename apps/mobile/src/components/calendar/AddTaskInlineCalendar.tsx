import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import { useCreateTask } from "@shared/api/hooks/tasks/useCreateTask";
import { cardShadow, textLine } from "../../lib/styles/platform";

type Props = {
  dateStr: string;
  modeId: number;
};

export default function AddTaskInlineCalendar({ dateStr, modeId }: Props) {
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [dueTime, setDueTime] = useState<string | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const createTask = useCreateTask();

  const handleTimeChange = (_event: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === "ios");
    if (selectedDate) {
      const hh = String(selectedDate.getHours()).padStart(2, "0");
      const mm = String(selectedDate.getMinutes()).padStart(2, "0");
      setDueTime(`${hh}:${mm}`);
    }
  };

  const handleCreate = () => {
    if (!title.trim() || !modeId) return;
    createTask.mutate(
      {
        title: title.trim(),
        modeId,
        dueDate: dateStr,
        dueTime: dueTime || undefined,
      },
      {
        onSuccess: () => {
          setTitle("");
          setDueTime(null);
          setShowTimePicker(false);
          // Stay in composing mode for rapid entry
        },
      }
    );
  };

  if (!composing) {
    return (
      <View style={{ alignItems: "flex-end", paddingHorizontal: 16, paddingTop: 6 }}>
        <TouchableOpacity onPress={() => setComposing(true)}>
          <Text style={{ ...textLine(14), fontWeight: "600", color: "#6b7280" }}>
            + Add Task
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={{
        marginHorizontal: 12,
        marginTop: 6,
        borderWidth: 1,
        borderColor: "#d1d5db",
        borderRadius: 8,
        overflow: "hidden" as const,
        padding: 12,
        backgroundColor: "#fff",
        ...cardShadow("sm"),
      }}
    >
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Task title"
        autoFocus
        style={{
          borderWidth: 1,
          borderColor: "#d1d5db",
          borderRadius: 8,
          padding: 10,
          fontSize: 15,
          backgroundColor: "#fff",
        }}
        onSubmitEditing={handleCreate}
        returnKeyType="done"
      />

      {/* Time picker row */}
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, gap: 8 }}>
        <TouchableOpacity
          onPress={() => setShowTimePicker((p) => !p)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderWidth: 1,
            borderColor: dueTime ? "#2563eb" : "#d1d5db",
            borderRadius: 6,
            backgroundColor: dueTime ? "#eff6ff" : "#f9fafb",
          }}
        >
          <Feather name="clock" size={14} color={dueTime ? "#2563eb" : "#9ca3af"} />
          <Text style={{ ...textLine(13), color: dueTime ? "#2563eb" : "#9ca3af" }}>
            {dueTime ?? "Add time"}
          </Text>
        </TouchableOpacity>
        {dueTime && (
          <TouchableOpacity
            onPress={() => { setDueTime(null); setShowTimePicker(false); }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Feather name="x" size={14} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>

      {showTimePicker && (
        <DateTimePicker
          value={
            dueTime
              ? (() => {
                  const [h, m] = dueTime.split(":").map(Number);
                  const d = new Date();
                  d.setHours(h, m, 0, 0);
                  return d;
                })()
              : new Date()
          }
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleTimeChange}
        />
      )}

      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          alignItems: "center",
          marginTop: 10,
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => {
            setComposing(false);
            setTitle("");
            setDueTime(null);
            setShowTimePicker(false);
          }}
        >
          <Text style={{ ...textLine(14), color: "#6b7280" }}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleCreate}
          disabled={createTask.isPending || !title.trim()}
          style={{
            backgroundColor: title.trim() ? "#2563eb" : "#9ca3af",
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
          }}
        >
          {createTask.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={{ color: "#fff", ...textLine(14), fontWeight: "600" }}>
              Create
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
