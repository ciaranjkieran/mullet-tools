import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { Mode } from "@shared/types/Mode";
import type { Goal } from "@shared/types/Goal";
import type { Project } from "@shared/types/Project";
import type { Milestone } from "@shared/types/Milestone";
import type { Task } from "@shared/types/Task";

type Props = {
  modes: Mode[];
  goals: Goal[];
  projects: Project[];
  milestones: Milestone[];
  tasks: Task[];
  modeId: number | null;
  goalId: number | null;
  projectId: number | null;
  milestoneId: number | null;
  taskId: number | null;
  setModeId: (id: number | null) => void;
  setGoalId: (id: number | null) => void;
  setProjectId: (id: number | null) => void;
  setMilestoneId: (id: number | null) => void;
  setTaskId: (id: number | null) => void;
  disabled: boolean;
};

function ChipRow({
  label,
  icon,
  items,
  selectedId,
  onSelect,
  modeColor,
  disabled,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  items: { id: number; title: string }[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  modeColor: string;
  disabled: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <View style={{ marginBottom: 12 }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: "#6b7280",
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {items.map((item) => {
            const isActive = selectedId === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => onSelect(isActive ? null : item.id)}
                disabled={disabled}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: isActive ? modeColor : "#f3f4f6",
                  borderWidth: 1,
                  borderColor: isActive ? modeColor : "#e5e7eb",
                  opacity: disabled ? 0.5 : 1,
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 14,
                    color: isActive ? "#fff" : "#374151",
                    fontWeight: isActive ? "600" : "400",
                  }}
                >
                  {item.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

export default function EntityPicker({
  modes,
  goals,
  projects,
  milestones,
  tasks,
  modeId,
  goalId,
  projectId,
  milestoneId,
  taskId,
  setModeId,
  setGoalId,
  setProjectId,
  setMilestoneId,
  setTaskId,
  disabled,
}: Props) {
  const modeColor =
    modes.find((m) => m.id === modeId)?.color ?? "#6b7280";

  // Filter entities by selected mode
  const modeGoals = modeId
    ? goals.filter((g) => g.modeId === modeId)
    : [];
  const modeProjects = modeId
    ? projects.filter((p) => p.modeId === modeId)
    : [];
  const modeMilestones = modeId
    ? milestones.filter((m) => m.modeId === modeId)
    : [];
  const modeTasks = modeId
    ? tasks.filter((t) => t.modeId === modeId)
    : [];

  // Cascading clear: when parent changes, clear children
  const handleModeChange = (id: number | null) => {
    setModeId(id);
    setGoalId(null);
    setProjectId(null);
    setMilestoneId(null);
    setTaskId(null);
  };

  const handleGoalChange = (id: number | null) => {
    setGoalId(id);
    setProjectId(null);
    setMilestoneId(null);
    setTaskId(null);
  };

  const handleProjectChange = (id: number | null) => {
    setProjectId(id);
    setMilestoneId(null);
    setTaskId(null);
  };

  const handleMilestoneChange = (id: number | null) => {
    setMilestoneId(id);
    setTaskId(null);
  };

  return (
    <View style={{ marginBottom: 8 }}>
      <ChipRow
        label="Mode"
        icon="layers"
        items={modes}
        selectedId={modeId}
        onSelect={handleModeChange}
        modeColor={modeColor}
        disabled={disabled}
      />

      {modeId && (
        <>
          <ChipRow
            label="Goal"
            icon="target"
            items={modeGoals}
            selectedId={goalId}
            onSelect={handleGoalChange}
            modeColor={modeColor}
            disabled={disabled}
          />

          <ChipRow
            label="Project"
            icon="folder"
            items={modeProjects}
            selectedId={projectId}
            onSelect={handleProjectChange}
            modeColor={modeColor}
            disabled={disabled}
          />

          <ChipRow
            label="Milestone"
            icon="flag"
            items={modeMilestones}
            selectedId={milestoneId}
            onSelect={handleMilestoneChange}
            modeColor={modeColor}
            disabled={disabled}
          />

          <ChipRow
            label="Task"
            icon="check-circle"
            items={modeTasks}
            selectedId={taskId}
            onSelect={setTaskId}
            modeColor={modeColor}
            disabled={disabled}
          />
        </>
      )}
    </View>
  );
}
