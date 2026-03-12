import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { useModes } from "@shared/api/hooks/modes/useModes";
import { useModeStore } from "@shared/store/useModeStore";
import { useStatsTree } from "@shared/api/hooks/stats/useStatsTree";
import ModeFilter from "../components/ModeFilter";
import DateRangePicker from "../components/stats/DateRangePicker";
import StatsNodeCard from "../components/stats/StatsNodeCard";
import type { Mode } from "@shared/types/Mode";
import type { StatsTree } from "@shared/types/Stats";

type Preset = "today" | "thisWeek" | "thisMonth" | "allTime";

function formatDuration(seconds: number): string {
  if (seconds === 0) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function ModeStatsCard({
  tree,
  mode,
}: {
  tree: StatsTree;
  mode: Mode;
}) {
  const maxSeconds = useMemo(() => {
    let max = 0;
    for (const g of tree.goals) if (g.seconds > max) max = g.seconds;
    for (const p of tree.projects) if (p.seconds > max) max = p.seconds;
    for (const m of tree.milestones) if (m.seconds > max) max = m.seconds;
    for (const t of tree.tasks) if (t.seconds > max) max = t.seconds;
    return max || 1;
  }, [tree]);

  const hasData =
    tree.goals.length > 0 ||
    tree.projects.length > 0 ||
    tree.milestones.length > 0 ||
    tree.tasks.length > 0 ||
    tree.selfSeconds > 0;

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
        <Text style={{ flex: 1, fontSize: 16, fontWeight: "600", color: "#111" }}>
          {mode.title}
        </Text>
        <Text style={{ fontSize: 16, fontWeight: "700", color: "#111" }}>
          {formatDuration(tree.seconds)}
        </Text>
      </View>

      {/* Body */}
      {hasData ? (
        <View style={{ padding: 10 }}>
          {tree.selfSeconds > 0 && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 6,
                paddingHorizontal: 4,
              }}
            >
              <View style={{ width: 18 }} />
              <Feather name="clock" size={14} color="#9ca3af" style={{ marginRight: 8 }} />
              <Text style={{ flex: 1, fontSize: 14, color: "#6b7280", fontStyle: "italic" }}>
                Unassigned time
              </Text>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151" }}>
                {formatDuration(tree.selfSeconds)}
              </Text>
            </View>
          )}
          {tree.goals.map((g) => (
            <StatsNodeCard
              key={`g-${g.id}`}
              node={g}
              kind="goal"
              modeColor={mode.color}
            />
          ))}
          {tree.projects.map((p) => (
            <StatsNodeCard
              key={`p-${p.id}`}
              node={p}
              kind="project"
              modeColor={mode.color}
            />
          ))}
          {tree.milestones.map((m) => (
            <StatsNodeCard
              key={`m-${m.id}`}
              node={m}
              kind="milestone"
              modeColor={mode.color}
            />
          ))}
          {tree.tasks.map((t) => (
            <StatsNodeCard
              key={`t-${t.id}`}
              node={t}
              kind="task"
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
    [modeId, from, to]
  );

  const { data: tree, isLoading } = useStatsTree(args);

  if (isLoading) {
    return (
      <View style={{ padding: 20, alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!tree) return null;

  return <ModeStatsCard tree={tree} mode={mode} />;
}

export default function StatsScreen() {
  useModes(); // ensure modes loaded

  const modes = useModeStore((s) => s.modes);
  const selectedMode = useModeStore((s) => s.selectedMode);
  const setSelectedMode = useModeStore((s) => s.setSelectedMode);

  const now = new Date();
  const [preset, setPreset] = useState<Preset>("thisWeek");
  const [from, setFrom] = useState(
    format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd")
  );
  const [to, setTo] = useState(
    format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd")
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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <Text style={{ fontSize: 24, fontWeight: "bold" }}>Stats</Text>
      </View>

      <ModeFilter
        modes={modes}
        selectedMode={selectedMode}
        setSelectedMode={setSelectedMode}
      />

      <DateRangePicker activePreset={preset} onSelect={handlePreset} />

      {/* Range label */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        <Text style={{ fontSize: 12, color: "#9ca3af" }}>
          {preset === "allTime"
            ? "All time"
            : `${from} — ${to}`}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        {modesToShow.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 60 }}>
            <Feather name="bar-chart-2" size={40} color="#d1d5db" />
            <Text style={{ color: "#9ca3af", fontSize: 16, marginTop: 12 }}>
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
    </SafeAreaView>
  );
}
