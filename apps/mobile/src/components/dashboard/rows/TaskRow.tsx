import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useUpdateTask } from "@shared/api/hooks/tasks/useUpdateTask";
import { useDeleteTask } from "@shared/api/hooks/tasks/useDeleteTask";
import { useEntityFormStore } from "../../../lib/store/useEntityFormStore";
import { useSelectionStore } from "../../../lib/store/useSelectionStore";
import type { Task } from "@shared/types/Task";
import type { DashboardRow } from "../../../hooks/useBuildDashboardRows";
import AssigneeBadge from "./AssigneeBadge";

type Props = { row: DashboardRow };

function TaskRow({ row }: Props) {
  const task = row.entity as Task;
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const openEdit = useEntityFormStore((s) => s.openEdit);
  const selectionActive = useSelectionStore((s) => s.isActive);
  const isSelected = useSelectionStore((s) => s.isSelected("task", task.id));
  const toggleSelection = useSelectionStore((s) => s.toggle);

  const handleToggle = () => {
    updateTask.mutate({ id: task.id, isCompleted: !task.isCompleted });
  };

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
    if (!selectionActive) {
      toggleSelection("task", task.id);
    } else {
      handleDelete();
    }
  };

  const indent = row.depth * 16;

  return (
    <View
      style={{
        marginLeft: indent + 12,
        marginRight: 12,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: isSelected ? row.modeColor : "#e5e7eb",
        borderRadius: 8,
        backgroundColor: isSelected ? row.modeColor + "08" : "#fff",
        padding: 12,
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
      }}
    >
      {/* Left: colored dot + title column */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", flex: 1, minWidth: 0, gap: 10 }}>
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: row.modeColor,
            marginTop: 4,
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
              fontSize: 13,
              fontWeight: "600",
              color: task.isCompleted ? "#9ca3af" : "#111",
              textDecorationLine: task.isCompleted ? "line-through" : "none",
            }}
          >
            {task.title}
          </Text>

          {task.dueDate ? (
            <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
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
            name={task.isCompleted ? "check-square" : "square"}
            size={20}
            color={task.isCompleted ? "#9ca3af" : row.modeColor}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default React.memo(TaskRow);
