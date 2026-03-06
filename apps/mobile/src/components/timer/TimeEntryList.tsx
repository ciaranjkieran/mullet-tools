import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useGoalStore } from "@shared/store/useGoalStore";
import { useProjectStore } from "@shared/store/useProjectStore";
import { useMilestoneStore } from "@shared/store/useMilestoneStore";
import { useTaskStore } from "@shared/store/useTaskStore";
import type { TimeEntryDTO } from "@shared/types/Timer";
import type { Mode } from "@shared/types/Mode";

type Props = {
  entries: TimeEntryDTO[];
  modes: Mode[];
  onResume: (entry: TimeEntryDTO) => void;
  onDelete: (entryId: number) => void;
};

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${pad2(m)}:${pad2(s)}`;
  return `${m}:${pad2(s)}`;
}

function formatTime(isoDate: string) {
  const d = new Date(isoDate);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function useEntityLabel(entry: TimeEntryDTO, modes: Mode[]): string {
  const { path } = entry;
  const tasks = useTaskStore((s) => s.tasks);
  const milestones = useMilestoneStore((s) => s.milestones);
  const projects = useProjectStore((s) => s.projects);
  const goals = useGoalStore((s) => s.goals);

  if (path.taskId) {
    const t = tasks.find((x) => x.id === path.taskId);
    if (t) return t.title;
  }
  if (path.milestoneId) {
    const m = milestones.find((x) => x.id === path.milestoneId);
    if (m) return m.title;
  }
  if (path.projectId) {
    const p = projects.find((x) => x.id === path.projectId);
    if (p) return p.title;
  }
  if (path.goalId) {
    const g = goals.find((x) => x.id === path.goalId);
    if (g) return g.title;
  }
  const mode = modes.find((m) => m.id === path.modeId);
  return mode?.title ?? "Unknown";
}

function TimeEntryRow({
  entry,
  modes,
  onResume,
  onDelete,
}: {
  entry: TimeEntryDTO;
  modes: Mode[];
  onResume: (entry: TimeEntryDTO) => void;
  onDelete: (entryId: number) => void;
}) {
  const mode = modes.find((m) => m.id === entry.path.modeId);
  const modeColor = mode?.color ?? "#6b7280";
  const entityLabel = useEntityLabel(entry, modes);

  const handleDelete = () => {
    Alert.alert("Delete Entry", "Remove this time entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDelete(entry.id),
      },
    ]);
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
      }}
    >
      <View
        style={{
          width: 4,
          height: 32,
          borderRadius: 2,
          backgroundColor: modeColor,
          marginRight: 12,
        }}
      />

      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: "500", color: "#111" }}>
          {entityLabel}
        </Text>
        <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
          {formatTime(entry.startedAt)} - {formatTime(entry.endedAt)}
          {"  "}
          <Feather name={entry.kind === "stopwatch" ? "watch" : "clock"} size={10} color="#9ca3af" />
        </Text>
      </View>

      <Text
        style={{
          fontSize: 15,
          fontWeight: "600",
          fontVariant: ["tabular-nums"],
          color: "#374151",
          marginRight: 12,
        }}
      >
        {formatDuration(entry.seconds)}
      </Text>

      <TouchableOpacity
        onPress={() => onResume(entry)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={{ marginRight: 8 }}
      >
        <Feather name="play" size={18} color="#2563eb" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleDelete}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="trash-2" size={16} color="#dc2626" />
      </TouchableOpacity>
    </View>
  );
}

export default function TimeEntryList({
  entries,
  modes,
  onResume,
  onDelete,
}: Props) {
  if (entries.length === 0) {
    return (
      <View style={{ alignItems: "center", paddingVertical: 24 }}>
        <Text style={{ color: "#9ca3af", fontSize: 14 }}>
          No entries yet today
        </Text>
      </View>
    );
  }

  return (
    <View>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: "#6b7280",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: 8,
        }}
      >
        Today
      </Text>
      {entries.map((entry) => (
        <TimeEntryRow
          key={entry.id}
          entry={entry}
          modes={modes}
          onResume={onResume}
          onDelete={onDelete}
        />
      ))}
    </View>
  );
}
