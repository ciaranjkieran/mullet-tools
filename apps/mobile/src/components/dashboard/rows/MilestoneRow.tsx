import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useUpdateMilestone } from "@shared/api/hooks/milestones/useUpdateMilestone";
import { useDeleteMilestone } from "@shared/api/hooks/milestones/useDeleteMilestone";
import { useCollapseStore } from "../../../lib/store/useCollapseStore";
import { useEntityFormStore } from "../../../lib/store/useEntityFormStore";
import { useSelectionStore } from "../../../lib/store/useSelectionStore";
import { useFocusModalStore } from "../../../lib/store/useFocusModalStore";
import { cardShadow, selectedShadow, textLine } from "../../../lib/styles/platform";
import type { Milestone } from "@shared/types/Milestone";
import type { DashboardRow } from "../../../hooks/useBuildDashboardRows";
import AssigneeBadge from "./AssigneeBadge";

type Props = { row: DashboardRow };

function MilestoneRow({ row }: Props) {
  const milestone = row.entity as Milestone;
  const qc = useQueryClient();
  const updateMilestone = useUpdateMilestone();
  const deleteMilestone = useDeleteMilestone();
  const toggle = useCollapseStore((s) => s.toggle);
  const isCollapsed = useCollapseStore((s) => s.isCollapsed);
  const openEdit = useEntityFormStore((s) => s.openEdit);
  const selectionActive = useSelectionStore((s) => s.isActive);
  const isSelected = useSelectionStore((s) => s.isSelected("milestone", milestone.id));
  const toggleSelection = useSelectionStore((s) => s.toggle);

  const collapseKey = `milestone-${milestone.id}`;
  const collapsed = isCollapsed(collapseKey);

  const handleToggleComplete = () => {
    deleteMilestone.mutate(milestone.id, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["activeTimer"], exact: false });
        qc.invalidateQueries({ queryKey: ["timer"], exact: false });
      },
    });
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Milestone",
      `Delete "${milestone.title}" and all its children? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMilestone.mutate(milestone.id),
        },
      ]
    );
  };

  const handlePress = () => {
    if (selectionActive) {
      toggleSelection("milestone", milestone.id);
    } else {
      openEdit("milestone", milestone);
    }
  };

  const handleLongPress = () => {
    toggleSelection("milestone", milestone.id);
  };

  const indent = row.depth * 16;

  return (
    <View
      style={{
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
        alignItems: "flex-start",
        justifyContent: "space-between",
        ...(isSelected ? selectedShadow(row.modeColor) : cardShadow("sm")),
      }}
    >
      {/* Left: triangle icon + title column */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", flex: 1, minWidth: 0, gap: 10 }}>
        <TouchableOpacity
          onPress={() => toggle(collapseKey)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            width: 20,
            height: 20,
            justifyContent: "center",
            alignItems: "center",
            marginTop: 1,
          }}
        >
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: 6,
              borderRightWidth: 6,
              borderTopWidth: 10,
              borderLeftColor: "transparent",
              borderRightColor: "transparent",
              borderTopColor: row.modeColor,
              transform: [{ rotate: collapsed ? "-90deg" : "0deg" }],
            }}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handlePress}
          onLongPress={handleLongPress}
          style={{ flex: 1, minWidth: 0 }}
          activeOpacity={0.6}
        >
          <Text
            style={{
              ...textLine(14),
              fontWeight: "600",
              color: milestone.isCompleted ? "#9ca3af" : "#111",
              textDecorationLine: milestone.isCompleted
                ? "line-through"
                : "none",
            }}
          >
            {milestone.title}
          </Text>

          {milestone.dueDate ? (
            <Text style={{ ...textLine(11), color: "#9ca3af", marginTop: 2 }}>
              Due: {milestone.dueDate}
            </Text>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* Right: assignee + scope/completion */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginLeft: 8 }}>
        <AssigneeBadge assignee={milestone.assignee} />
        {collapsed ? (
          <TouchableOpacity
            onPress={handleToggleComplete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather
              name={milestone.isCompleted ? "check-square" : "square"}
              size={20}
              color={milestone.isCompleted ? "#9ca3af" : row.modeColor}
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() =>
              useFocusModalStore.getState().open("milestone", milestone, row.modeColor, row.modeId)
            }
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="crosshair" size={20} color={row.modeColor} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default React.memo(MilestoneRow);
