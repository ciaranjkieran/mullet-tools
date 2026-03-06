import React, { useState, useMemo, type ReactElement } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { useStatsTree } from "@shared/api/hooks/stats/useStatsTree";
import DateRangePicker from "../stats/DateRangePicker";
import StatsNodeCard from "../stats/StatsNodeCard";
import type { Mode } from "@shared/types/Mode";
import type { StatsTree, StatsNode } from "@shared/types/Stats";

type Preset = "today" | "thisWeek" | "thisMonth" | "allTime";
type EntityKind = "mode" | "goal" | "project" | "milestone" | "task";

type FlattenedItem = {
  kind: EntityKind;
  node: StatsNode;
  parentTitle: string | null;
};

function formatDuration(seconds: number): string {
  if (seconds === 0) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** Flatten tree into a sorted list by selfSeconds (matching web's StatsByModeCard) */
function flattenStatsTree(tree: StatsTree, modeLabel: string): FlattenedItem[] {
  const items: FlattenedItem[] = [];

  const walk = (
    kind: Exclude<EntityKind, "mode">,
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

  tree.goals.forEach((g) => walk("goal", g, modeLabel));
  tree.projects.forEach((p) => walk("project", p, modeLabel));
  tree.milestones.forEach((m) => walk("milestone", m, modeLabel));
  tree.tasks.forEach((t) => walk("task", t, modeLabel));

  // Mode-level direct time
  if (tree.selfSeconds > 0) {
    const modeNode: StatsNode = {
      id: -1,
      title: modeLabel,
      selfSeconds: tree.selfSeconds,
      seconds: tree.selfSeconds,
      goals: [],
      projects: [],
      milestones: [],
      tasks: [],
    };
    items.unshift({ kind: "mode", node: modeNode, parentTitle: null });
  }

  return items.sort(
    (a, b) => (b.node.selfSeconds ?? 0) - (a.node.selfSeconds ?? 0),
  );
}

function ModeStatsCard({ tree, mode }: { tree: StatsTree; mode: Mode }) {
  const flattened = useMemo(
    () => flattenStatsTree(tree, mode.title || "This mode"),
    [tree, mode.title],
  );

  const hasData = flattened.length > 0;

  return (
    <View
      style={{
        marginHorizontal: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 14,
          backgroundColor: mode.color + "15",
          borderBottomWidth: 1,
          borderBottomColor: "#e5e7eb",
        }}
      >
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: mode.color,
            marginRight: 10,
          }}
        />
        <Text
          style={{ flex: 1, fontSize: 16, fontWeight: "600", color: "#111" }}
        >
          {mode.title}
        </Text>
        <Text style={{ fontSize: 16, fontWeight: "700", color: "#111", fontFamily: "monospace" }}>
          {formatDuration(tree.seconds)}
        </Text>
      </View>

      {hasData ? (
        <View style={{ padding: 10 }}>
          {/* Total + label */}
          <View
            style={{
              borderBottomWidth: 1,
              borderBottomColor: "#f3f4f6",
              paddingBottom: 8,
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                color: "#9ca3af",
              }}
            >
              Total
            </Text>
            <Text style={{ fontSize: 28, fontWeight: "700", color: "#111", fontFamily: "monospace" }}>
              {formatDuration(tree.seconds)}
            </Text>
          </View>

          {/* Flattened entity list */}
          {flattened.map((item) => (
            <StatsNodeCard
              key={`${item.kind}-${item.node.id}`}
              node={item.node}
              kind={item.kind}
              parentTitle={item.parentTitle}
              modeColor={mode.color}
            />
          ))}
        </View>
      ) : (
        <View style={{ padding: 20, alignItems: "center" }}>
          <Text style={{ color: "#9ca3af", fontSize: 14 }}>
            No time tracked in this period
          </Text>
        </View>
      )}
    </View>
  );
}

function SingleModeStats({
  modeId,
  mode,
  from,
  to,
}: {
  modeId: number;
  mode: Mode;
  from: string;
  to: string;
}) {
  const args = useMemo(
    () => ({
      modeId,
      ...(from && to ? { from, to } : {}),
    }),
    [modeId, from, to],
  );

  const { data: tree, isLoading } = useStatsTree(args);

  if (isLoading) {
    return (
      <View style={{ padding: 20, alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!tree || tree.seconds === 0) return null;

  return <ModeStatsCard tree={tree} mode={mode} />;
}

type Props = {
  modes: Mode[];
  selectedMode: Mode | "All";
  listHeader?: ReactElement;
};

export default function StatsViewContent({
  modes,
  selectedMode,
  listHeader,
}: Props) {
  const now = new Date();
  const [preset, setPreset] = useState<Preset>("thisWeek");
  const [from, setFrom] = useState(
    format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
  );
  const [to, setTo] = useState(
    format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
  );

  const handlePreset = (p: Preset, f: string, t: string) => {
    setPreset(p);
    setFrom(f);
    setTo(t);
  };

  const modesToShow = useMemo(() => {
    if (selectedMode === "All") return modes;
    return modes.filter((m) => m.id === (selectedMode as Mode).id);
  }, [modes, selectedMode]);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
      {listHeader}
      <DateRangePicker activePreset={preset} onSelect={handlePreset} />

      {/* Range label */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        <Text style={{ fontSize: 12, color: "#9ca3af" }}>
          {preset === "allTime" ? "All time" : `${from} — ${to}`}
        </Text>
      </View>

      {modesToShow.length === 0 ? (
        <View style={{ alignItems: "center", paddingTop: 60 }}>
          <Feather name="bar-chart-2" size={40} color="#d1d5db" />
          <Text
            style={{ color: "#9ca3af", fontSize: 16, marginTop: 12 }}
          >
            No modes to display
          </Text>
        </View>
      ) : (
        modesToShow.map((mode) => (
          <SingleModeStats
            key={mode.id}
            modeId={mode.id}
            mode={mode}
            from={from}
            to={to}
          />
        ))
      )}
    </ScrollView>
  );
}
