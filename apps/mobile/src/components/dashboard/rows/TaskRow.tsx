import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, Alert, Animated } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useDeleteTask } from "@shared/api/hooks/tasks/useDeleteTask";
import { useEntityFormStore } from "../../../lib/store/useEntityFormStore";
import { useSelectionStore } from "../../../lib/store/useSelectionStore";
import { cardShadow, selectedShadow, textLine } from "../../../lib/styles/platform";
import type { Task } from "@shared/types/Task";
import type { DashboardRow } from "../../../hooks/useBuildDashboardRows";
import AssigneeBadge from "./AssigneeBadge";

type Props = { row: DashboardRow };

function TaskRow({ row }: Props) {
  const task = row.entity as Task;
  const qc = useQueryClient();
  const deleteTask = useDeleteTask();
  const openEdit = useEntityFormStore((s) => s.openEdit);
  const selectionActive = useSelectionStore((s) => s.isActive);
  const isSelected = useSelectionStore((s) => s.isSelected("task", task.id));
  const toggleSelection = useSelectionStore((s) => s.toggle);
  const [checked, setChecked] = useState(false);
  const [opacity] = useState(() => new Animated.Value(1));

  const handleToggle = useCallback(() => {
    if (checked) return;
    setChecked(true);
    Animated.timing(opacity, {
      toValue: 0,
      duration: 400,
      delay: 200,
      useNativeDriver: true,
    }).start(() => {
      deleteTask.mutate(task.id, {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["activeTimer"], exact: false });
          qc.invalidateQueries({ queryKey: ["timer"], exact: false });
          qc.invalidateQueries({ queryKey: ["time-entries"], exact: false });
          qc.invalidateQueries({ queryKey: ["timeEntries"], exact: false });
        },
      });
    });
  }, [checked, opacity, deleteTask, task.id, qc]);

  const handleDelete = () => {
    Alert.alert(
      "Delete Task",
      `Delete "${task.title}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteTask.mutate(task.id),
        },
      ]
    );
  };

  const handlePress = () => {
    if (selectionActive) {
      toggleSelection("task", task.id);
    } else {
      openEdit("task", task);
    }
  };

  const handleLongPress = () => {
    toggleSelection("task", task.id);
  };

  const indent = row.depth * 16;

  return (
    <Animated.View
      style={{
        opacity,
        marginLeft: indent + 12,
        marginRight: 12,
        marginBottom: 6,
        borderWidth: isSelected ? 2 : 1,
        borderColor: isSelected ? row.modeColor : "#e5e7eb",
        borderRadius: 8,
        overflow: "hidden" as const,
        backgroundColor: isSelected ? "#f0f8ff" : "#fff",
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        ...(isSelected ? selectedShadow(row.modeColor) : cardShadow("sm")),
      }}
    >
      {/* Left: colored dot + title column */}
      <View style={{ flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0, gap: 10 }}>
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: row.modeColor,
          }}
        />

        <TouchableOpacity
          onPress={handlePress}
          onLongPress={handleLongPress}
          style={{ flex: 1, minWidth: 0 }}
          activeOpacity={0.6}
        >
          <Text
            style={{
              ...textLine(13),
              fontWeight: "600",
              color: task.isCompleted ? "#9ca3af" : "#111",
              textDecorationLine: task.isCompleted ? "line-through" : "none",
            }}
          >
            {task.title}
          </Text>

          {task.dueDate ? (
            <Text style={{ ...textLine(11), color: "#9ca3af", marginTop: 2 }}>
              Due: {task.dueDate}
            </Text>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* Right: assignee + completion checkbox */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginLeft: 8 }}>
        <AssigneeBadge assignee={task.assignee} />
        <TouchableOpacity
          onPress={handleToggle}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather
            name={checked ? "check-square" : "square"}
            size={20}
            color={checked ? row.modeColor : row.modeColor}
          />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export default React.memo(TaskRow);
