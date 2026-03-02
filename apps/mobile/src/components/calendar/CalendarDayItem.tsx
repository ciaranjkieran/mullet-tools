import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useUpdateGoal } from "@shared/api/hooks/goals/useUpdateGoal";
import { useUpdateProject } from "@shared/api/hooks/projects/useUpdateProject";
import { useUpdateMilestone } from "@shared/api/hooks/milestones/useUpdateMilestone";
import { useUpdateTask } from "@shared/api/hooks/tasks/useUpdateTask";
import { useGoalStore } from "@shared/store/useGoalStore";
import { useProjectStore } from "@shared/store/useProjectStore";
import { useMilestoneStore } from "@shared/store/useMilestoneStore";
import { useTaskStore } from "@shared/store/useTaskStore";
import type { EntityFormType } from "../../lib/store/useEntityFormStore";

type CalendarEntity = {
  id: number;
  type: "goal" | "project" | "milestone" | "task";
  title: string;
  dueDate: string;
  isCompleted: boolean;
  modeId: number;
  modeColor: string;
};

const FEATHER_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  goal: "target",
  project: "folder",
};

function EntityIcon({ type, color }: { type: string; color: string }) {
  if (type === "task") {
    return (
      <View style={{ width: 18, height: 18, justifyContent: "center", alignItems: "center" }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      </View>
    );
  }
  if (type === "milestone") {
    return (
      <View style={{ width: 18, height: 18, justifyContent: "center", alignItems: "center" }}>
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: 7,
            borderRightWidth: 7,
            borderTopWidth: 12,
            borderLeftColor: "transparent",
            borderRightColor: "transparent",
            borderTopColor: color,
          }}
        />
      </View>
    );
  }
  return <Feather name={FEATHER_ICONS[type] ?? "circle"} size={18} color={color} />;
}

type Props = {
  entity: CalendarEntity;
  formStore: {
    openEdit: (type: EntityFormType, entity: any) => void;
  };
};

export default function CalendarDayItem({ entity, formStore }: Props) {
  const updateGoal = useUpdateGoal();
  const updateProject = useUpdateProject();
  const updateMilestone = useUpdateMilestone();
  const updateTask = useUpdateTask();

  // We need to fetch the full entity for editing
  const goals = useGoalStore((s) => s.goals);
  const projects = useProjectStore((s) => s.projects);
  const milestones = useMilestoneStore((s) => s.milestones);
  const tasks = useTaskStore((s) => s.tasks);

  const handleToggleComplete = () => {
    const payload = { id: entity.id, isCompleted: !entity.isCompleted };
    switch (entity.type) {
      case "goal":
        updateGoal.mutate(payload);
        break;
      case "project":
        updateProject.mutate(payload);
        break;
      case "milestone":
        updateMilestone.mutate(payload);
        break;
      case "task":
        updateTask.mutate(payload);
        break;
    }
  };

  const handleTap = () => {
    let fullEntity;
    switch (entity.type) {
      case "goal":
        fullEntity = goals.find((g) => g.id === entity.id);
        break;
      case "project":
        fullEntity = projects.find((p) => p.id === entity.id);
        break;
      case "milestone":
        fullEntity = milestones.find((m) => m.id === entity.id);
        break;
      case "task":
        fullEntity = tasks.find((t) => t.id === entity.id);
        break;
    }
    if (fullEntity) {
      formStore.openEdit(entity.type, fullEntity);
    }
  };

  return (
    <TouchableOpacity
      onPress={handleTap}
      activeOpacity={0.6}
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
      }}
    >
      <TouchableOpacity
        onPress={handleToggleComplete}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={{ marginTop: 2 }}
      >
        {entity.isCompleted ? (
          <Feather name="check-circle" size={18} color="#9ca3af" />
        ) : (
          <EntityIcon type={entity.type} color={entity.modeColor} />
        )}
      </TouchableOpacity>

      <View
        style={{
          width: 3,
          height: 20,
          borderRadius: 1.5,
          backgroundColor: entity.modeColor,
          marginLeft: 10,
          marginRight: 10,
        }}
      />

      <Text
        style={{
          flex: 1,
          fontSize: 15,
          color: entity.isCompleted ? "#9ca3af" : "#111",
          textDecorationLine: entity.isCompleted ? "line-through" : "none",
        }}
      >
        {entity.title}
      </Text>

      <Text
        style={{
          fontSize: 11,
          color: "#9ca3af",
          textTransform: "uppercase",
          marginLeft: 8,
          marginTop: 3,
        }}
      >
        {entity.type}
      </Text>
    </TouchableOpacity>
  );
}
