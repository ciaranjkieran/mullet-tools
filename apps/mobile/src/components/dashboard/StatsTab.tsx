import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { useEntityStatsNode } from "@shared/api/hooks/stats/useEntityStatsNode";
import {
  useStatsFilterStore,
  type StatsRange,
} from "@shared/store/useStatsFilterStore";
import { textLine } from "../../lib/styles/platform";
import StatsNodeCard from "../stats/StatsNodeCard";
import StatsPieChart from "../stats/StatsPieChart";
import type { StatsPieSegment } from "../stats/StatsPieChart";
import type { EntityFormType } from "../../lib/store/useEntityFormStore";
import type { StatsNode } from "@shared/types/Stats";

type Props = {
  entityType: EntityFormType;
  entityId: number;
  modeId: number;
  modeColor: string;
};

type Preset = "today" | "thisWeek" | "thisMonth" | "allTime";
type EntityKind = "goal" | "project" | "milestone" | "task";

const PRESETS: { key: Preset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "thisWeek", label: "Week" },
  { key: "thisMonth", label: "Month" },
  { key: "allTime", label: "All" },
];

function toISO(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function rangeForPreset(preset: Preset): StatsRange {
  const now = new Date();
  switch (preset) {
    case "today":
      return { from: toISO(now), to: toISO(now), preset };
    case "thisWeek": {
      const ws = startOfWeek(now, { weekStartsOn: 1 });
      const we = endOfWeek(now, { weekStartsOn: 1 });
      return { from: toISO(ws), to: toISO(we), preset };
    }
    case "thisMonth": {
      const ms = startOfMonth(now);
      const me = endOfMonth(now);
      return { from: toISO(ms), to: toISO(me), preset };
    }
    case "allTime":
      return { from: "2020-01-01", to: toISO(now), preset };
  }
}

function formatDuration(totalSeconds: number): string {
  if (totalSeconds === 0) return "0m";
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

type FlattenedItem = {
  kind: EntityKind;
  node: StatsNode;
  parentTitle: string | null;
};

/** Flatten child nodes into a sorted list by selfSeconds */
function flattenNode(rootNode: StatsNode, rootTitle: string): FlattenedItem[] {
  const items: FlattenedItem[] = [];

  const walk = (
    kind: EntityKind,
    node: StatsNode,
    parentTitle: string | null,
  ) => {
    if (node.selfSeconds > 0) {
      items.push({ kind, node, parentTitle });
    }
    const hereTitle = node.title || null;
    node.goals?.forEach((child) => walk("goal", child, hereTitle));
    node.projects?.forEach((child) => walk("project", child, hereTitle));
    node.milestones?.forEach((child) => walk("milestone", child, hereTitle));
    node.tasks?.forEach((child) => walk("task", child, hereTitle));
  };

  rootNode.goals?.forEach((g) => walk("goal", g, rootTitle));
  rootNode.projects?.forEach((p) => walk("project", p, rootTitle));
  rootNode.milestones?.forEach((m) => walk("milestone", m, rootTitle));
  rootNode.tasks?.forEach((t) => walk("task", t, rootTitle));

  return items.sort(
    (a, b) => (b.node.selfSeconds ?? 0) - (a.node.selfSeconds ?? 0),
  );
}

export default function StatsTab({ entityType, entityId, modeId, modeColor }: Props) {
  const insets = useSafeAreaInsets();
  const { range, setRange } = useStatsFilterStore();
  const activePreset = range.preset ?? "today";

  const { node, isLoading } = useEntityStatsNode({ modeId, kind: entityType, entityId });

  const totalSeconds = node?.seconds ?? 0;

  const flattened = useMemo(() => {
    if (!node) return [];
    return flattenNode(node, node.title || "This entity");
  }, [node]);

  const pieSegments = useMemo<StatsPieSegment[]>(() => {
    return flattened
      .filter((item) => (item.node.selfSeconds ?? 0) > 0)
      .map((item) => ({
        label: item.node.title || "Untitled",
        seconds: item.node.selfSeconds ?? 0,
      }));
  }, [flattened]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: Math.max(40, insets.bottom + 16) }}>
      {/* Date range presets */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
        {PRESETS.map((p) => {
          const isActive = activePreset === p.key;
          return (
            <TouchableOpacity
              key={p.key}
              onPress={() => setRange(rangeForPreset(p.key))}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: isActive ? modeColor : "#f3f4f6",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  ...textLine(13),
                  fontWeight: "600",
                  color: isActive ? "#fff" : "#6b7280",
                }}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Total time card + pie chart */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          borderBottomWidth: 1,
          borderBottomColor: "#f3f4f6",
          paddingBottom: 12,
          marginBottom: 12,
          gap: 16,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              color: "#6b7280",
            }}
          >
            Total
          </Text>
          <Text style={{ fontSize: 30, fontWeight: "700", color: "#111" }}>
            {formatDuration(totalSeconds)}
          </Text>
        </View>

        {entityType !== "task" && (
          <StatsPieChart
            totalSeconds={totalSeconds}
            segments={pieSegments}
            color={modeColor}
          />
        )}
      </View>

      {/* Child breakdown */}
      {entityType !== "task" && flattened.length > 0 && (
        <View>
          {flattened.map((item) => (
            <StatsNodeCard
              key={`${item.kind}-${item.node.id}`}
              node={item.node}
              kind={item.kind}
              parentTitle={item.parentTitle}
              modeColor={modeColor}
            />
          ))}
        </View>
      )}

      {/* No data state */}
      {totalSeconds === 0 && (
        <View style={{ alignItems: "center", paddingVertical: 20 }}>
          <Feather name="clock" size={24} color="#d1d5db" />
          <Text style={{ ...textLine(14), color: "#9ca3af", fontStyle: "italic", marginTop: 8 }}>
            No time logged
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
