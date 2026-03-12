import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useUpdateProject } from "@shared/api/hooks/projects/useUpdateProject";
import { useDeleteProject } from "@shared/api/hooks/projects/useDeleteProject";
import { useCollapseStore } from "../../../lib/store/useCollapseStore";
import { useEntityFormStore } from "../../../lib/store/useEntityFormStore";
import { useSelectionStore } from "../../../lib/store/useSelectionStore";
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

  const handleToggleComplete = () => {
    updateProject.mutate({ id: project.id, isCompleted: !project.isCompleted }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["activeTimer"], exact: false });
        qc.invalidateQueries({ queryKey: ["timer"], exact: false });
        qc.invalidateQueries({ queryKey: ["time-entries"], exact: false });
        qc.invalidateQueries({ queryKey: ["timeEntries"], exact: false });
      },
    });
  };

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

      {/* Right: assignee + completion */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginLeft: 8 }}>
        <AssigneeBadge assignee={project.assignee} />
        {collapsed && (
          <TouchableOpacity
            onPress={handleToggleComplete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather
              name={project.isCompleted ? "check-square" : "square"}
              size={20}
              color={project.isCompleted ? "#9ca3af" : row.modeColor}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default React.memo(ProjectRow);
