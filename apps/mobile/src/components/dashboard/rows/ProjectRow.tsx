import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, Alert, Animated } from "react-native";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useUpdateProject } from "@shared/api/hooks/projects/useUpdateProject";
import { useDeleteProject } from "@shared/api/hooks/projects/useDeleteProject";
import { useCollapseStore } from "../../../lib/store/useCollapseStore";
import { useEntityFormStore } from "../../../lib/store/useEntityFormStore";
import { useSelectionStore } from "../../../lib/store/useSelectionStore";
import { useFocusModalStore } from "../../../lib/store/useFocusModalStore";
import { cardShadow, selectedShadow, textLine } from "../../../lib/styles/platform";
import type { Project } from "@shared/types/Project";
import type { DashboardRow } from "../../../hooks/useBuildDashboardRows";
import AssigneeBadge from "./AssigneeBadge";

type Props = { row: DashboardRow };

function ProjectRow({ row }: Props) {
  const project = row.entity as Project;
  const qc = useQueryClient();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const toggle = useCollapseStore((s) => s.toggle);
  const isCollapsed = useCollapseStore((s) => s.isCollapsed);
  const openEdit = useEntityFormStore((s) => s.openEdit);
  const selectionActive = useSelectionStore((s) => s.isActive);
  const isSelected = useSelectionStore((s) => s.isSelected("project", project.id));
  const toggleSelection = useSelectionStore((s) => s.toggle);

  const collapseKey = `project-${project.id}`;
  const collapsed = isCollapsed(collapseKey);
  const [checked, setChecked] = useState(false);
  const [opacity] = useState(() => new Animated.Value(1));

  const handleToggleComplete = useCallback(() => {
    if (checked) return;
    setChecked(true);
    deleteProject.mutate(project.id, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["activeTimer"], exact: false });
        qc.invalidateQueries({ queryKey: ["timer"], exact: false });
      },
    });
    Animated.timing(opacity, {
      toValue: 0,
      duration: 350,
      delay: 100,
      useNativeDriver: true,
    }).start();
  }, [checked, opacity, deleteProject, project.id, qc]);

  const handleDelete = () => {
    Alert.alert(
      "Delete Project",
      `Delete "${project.title}" and all its children? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteProject.mutate(project.id),
        },
      ]
    );
  };

  const handlePress = () => {
    if (selectionActive) {
      toggleSelection("project", project.id);
    } else {
      openEdit("project", project);
    }
  };

  const handleLongPress = () => {
    toggleSelection("project", project.id);
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
        alignItems: "flex-start",
        justifyContent: "space-between",
        ...(isSelected ? selectedShadow(row.modeColor) : cardShadow("sm")),
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
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {collapsed ? (
            <MaterialIcons name="folder" size={20} color={row.modeColor} />
          ) : (
            <Feather name="folder" size={20} color={row.modeColor} />
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
              ...textLine(15),
              fontWeight: "600",
              color: project.isCompleted ? "#9ca3af" : "#111",
              textDecorationLine: project.isCompleted ? "line-through" : "none",
            }}
          >
            {project.title}
          </Text>

          {project.dueDate ? (
            <Text style={{ ...textLine(11), color: "#9ca3af", marginTop: 2 }}>
              Due: {project.dueDate}
            </Text>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* Right: assignee + scope/completion */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginLeft: 8 }}>
        <AssigneeBadge assignee={project.assignee} />
        {!collapsed && row.hasChildren ? (
          <TouchableOpacity
            onPress={() =>
              useFocusModalStore.getState().open("project", project, row.modeColor, row.modeId)
            }
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="crosshair" size={20} color={row.modeColor} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

export default React.memo(ProjectRow);
