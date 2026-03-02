import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { StatsNode } from "@shared/types/Stats";

type Props = {
  node: StatsNode;
  type: "goal" | "project" | "milestone" | "task";
  maxSeconds: number;
  modeColor: string;
  depth?: number;
};

const ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  goal: "target",
  project: "folder",
  milestone: "flag",
  task: "circle",
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function StatsNodeCard({
  node,
  type,
  maxSeconds,
  modeColor,
  depth = 0,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const barWidth = maxSeconds > 0 ? (node.seconds / maxSeconds) * 100 : 0;
  const hasChildren =
    node.goals.length > 0 ||
    node.projects.length > 0 ||
    node.milestones.length > 0 ||
    node.tasks.length > 0;

  return (
    <View style={{ marginLeft: depth * 12 }}>
      <TouchableOpacity
        onPress={hasChildren ? () => setExpanded(!expanded) : undefined}
        activeOpacity={hasChildren ? 0.6 : 1}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 8,
          paddingHorizontal: 4,
        }}
      >
        {hasChildren ? (
          <Feather
            name={expanded ? "chevron-down" : "chevron-right"}
            size={14}
            color="#9ca3af"
            style={{ width: 18 }}
          />
        ) : (
          <View style={{ width: 18 }} />
        )}

        <Feather
          name={ICONS[type]}
          size={14}
          color={modeColor}
          style={{ marginRight: 8 }}
        />

        <Text
          numberOfLines={1}
          style={{ flex: 1, fontSize: 14, color: "#111" }}
        >
          {node.title}
        </Text>

        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: "#374151",
            marginLeft: 8,
            minWidth: 48,
            textAlign: "right",
          }}
        >
          {formatDuration(node.seconds)}
        </Text>
      </TouchableOpacity>

      {/* Bar */}
      <View
        style={{
          marginLeft: 26,
          height: 4,
          backgroundColor: "#f3f4f6",
          borderRadius: 2,
          marginBottom: 4,
        }}
      >
        <View
          style={{
            height: 4,
            width: `${Math.max(barWidth, 1)}%`,
            backgroundColor: modeColor,
            borderRadius: 2,
          }}
        />
      </View>

      {/* Children */}
      {expanded && (
        <View>
          {node.goals.map((g) => (
            <StatsNodeCard
              key={`g-${g.id}`}
              node={g}
              type="goal"
              maxSeconds={maxSeconds}
              modeColor={modeColor}
              depth={depth + 1}
            />
          ))}
          {node.projects.map((p) => (
            <StatsNodeCard
              key={`p-${p.id}`}
              node={p}
              type="project"
              maxSeconds={maxSeconds}
              modeColor={modeColor}
              depth={depth + 1}
            />
          ))}
          {node.milestones.map((m) => (
            <StatsNodeCard
              key={`m-${m.id}`}
              node={m}
              type="milestone"
              maxSeconds={maxSeconds}
              modeColor={modeColor}
              depth={depth + 1}
            />
          ))}
          {node.tasks.map((t) => (
            <StatsNodeCard
              key={`t-${t.id}`}
              node={t}
              type="task"
              maxSeconds={maxSeconds}
              modeColor={modeColor}
              depth={depth + 1}
            />
          ))}
        </View>
      )}
    </View>
  );
}
