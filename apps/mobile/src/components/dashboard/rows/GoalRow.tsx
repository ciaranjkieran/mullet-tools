import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useUpdateGoal } from "@shared/api/hooks/goals/useUpdateGoal";
import { useDeleteGoal } from "@shared/api/hooks/goals/useDeleteGoal";
import { useCollapseStore } from "../../../lib/store/useCollapseStore";
import { useEntityFormStore } from "../../../lib/store/useEntityFormStore";
import { useSelectionStore } from "../../../lib/store/useSelectionStore";
import type { Goal } from "@shared/types/Goal";
import type { DashboardRow } from "../../../hooks/useBuildDashboardRows";
import AssigneeBadge from "./AssigneeBadge";

type Props = { row: DashboardRow };

function GoalRow({ row }: Props) {
  const goal = row.entity as Goal;
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const toggle = useCollapseStore((s) => s.toggle);
  const isCollapsed = useCollapseStore((s) => s.isCollapsed);
  const openEdit = useEntityFormStore((s) => s.openEdit);
  const selectionActive = useSelectionStore((s) => s.isActive);
  const isSelected = useSelectionStore((s) => s.isSelected("goal", goal.id));
  const toggleSelection = useSelectionStore((s) => s.toggle);

  const collapseKey = `goal-${goal.id}`;
  const collapsed = isCollapsed(collapseKey);

  const handleToggleComplete = () => {
    updateGoal.mutate({ id: goal.id, isCompleted: !goal.isCompleted });
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Goal",
      `Delete "${goal.title}" and all its children? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteGoal.mutate(goal.id),
        },
      ]
    );
  };

  const handlePress = () => {
    if (selectionActive) {
      toggleSelection("goal", goal.id);
    } else {
      openEdit("goal", goal);
    }
  };

  const handleLongPress = () => {
    if (!selectionActive) {
      toggleSelection("goal", goal.id);
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
      {/* Left: icon + title column */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", flex: 1, minWidth: 0, gap: 10 }}>
        <TouchableOpacity
          onPress={() => toggle(collapseKey)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: collapsed ? "transparent" : row.modeColor,
            borderWidth: collapsed ? 2 : 0,
            borderColor: row.modeColor,
          }}
        >
          {collapsed ? (
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: row.modeColor,
              }}
            />
          ) : (
            <Feather name="target" size={14} color="#fff" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handlePress}
          onLongPress={handleLongPress}
          style={{ flex: 1, minWidth: 0 }}
          activeOpacity={0.6}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: goal.isCompleted ? "#9ca3af" : "#111",
              textDecorationLine: goal.isCompleted ? "line-through" : "none",
            }}
          >
            {goal.title}
          </Text>

          {goal.description && !collapsed ? (
            <Text
              numberOfLines={2}
              style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}
            >
              {goal.description}
            </Text>
          ) : null}

          {goal.dueDate ? (
            <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
              Due: {goal.dueDate}
            </Text>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* Right: assignee + completion */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginLeft: 8 }}>
        <AssigneeBadge assignee={goal.assignee} />
        {collapsed && (
          <TouchableOpacity
            onPress={handleToggleComplete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather
              name={goal.isCompleted ? "check-square" : "square"}
              size={20}
              color={goal.isCompleted ? "#9ca3af" : row.modeColor}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default React.memo(GoalRow);
