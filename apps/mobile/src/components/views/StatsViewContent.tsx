import React, { useState, useMemo, useCallback, useEffect, useRef, type ReactElement } from "react";
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { Feather } from "@expo/vector-icons";
import { format, startOfWeek, endOfWeek } from "date-fns";
import api from "@shared/api/axios";
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

type Props = {
  modes: Mode[];
  selectedMode: Mode | "All";
  listHeader?: ReactElement;
};

/** Resolve "allTime" to a wide date range since the backend requires from/to */
function resolveFromTo(
  preset: Preset,
  from: string,
  to: string,
): { from: string; to: string } {
  if (preset === "allTime" || !from || !to) {
    return {
      from: "2020-01-01",
      to: format(new Date(), "yyyy-MM-dd"),
    };
  }
  return { from, to };
}

/** Fetch a single mode's stats tree with retry + backoff for 429s */
async function fetchModeTree(
  modeId: number,
  from: string,
  to: string,
): Promise<StatsTree> {
  const params = { modeId, from, to };
  const maxRetries = 3;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await api.get<StatsTree>("/stats/tree", { params });
      return res.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 429 && attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

type ModeTreeResult = {
  mode: Mode;
  tree: StatsTree | null;
  error?: boolean;
};

/** Fetch mode trees in small batches to avoid rate limiting */
async function fetchAllModeTreesBatched(
  modes: Mode[],
  from: string,
  to: string,
  signal?: AbortSignal,
): Promise<ModeTreeResult[]> {
  const BATCH_SIZE = 3;
  const results: ModeTreeResult[] = [];

  for (let i = 0; i < modes.length; i += BATCH_SIZE) {
    if (signal?.aborted) break;

    const batch = modes.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map((mode) => fetchModeTree(mode.id, from, to)),
    );

    batch.forEach((mode, idx) => {
      const result = batchResults[idx];
      if (result.status === "fulfilled") {
        results.push({ mode, tree: result.value });
      } else {
        results.push({ mode, tree: null, error: true });
      }
    });
  }

  return results;
}

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
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<ModeTreeResult[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const handlePreset = (p: Preset, f: string, t: string) => {
    setPreset(p);
    setFrom(f);
    setTo(t);
  };

  const modesToShow = useMemo(() => {
    if (selectedMode === "All") return modes;
    return modes.filter((m) => m.id === (selectedMode as Mode).id);
  }, [modes, selectedMode]);

  const { from: resolvedFrom, to: resolvedTo } = resolveFromTo(preset, from, to);

  // Fetch mode trees in batches (3 at a time) to avoid 429 rate limiting
  const fetchAll = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    const data = await fetchAllModeTreesBatched(
      modesToShow,
      resolvedFrom,
      resolvedTo,
      controller.signal,
    );
    if (!controller.signal.aborted) {
      setResults(data);
      setLoading(false);
    }
  }, [modesToShow, resolvedFrom, resolvedTo]);

  useEffect(() => {
    if (modesToShow.length > 0) {
      fetchAll();
    } else {
      setResults([]);
      setLoading(false);
    }
    return () => abortRef.current?.abort();
  }, [fetchAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  const modeCards = results
    .filter((r) => r.tree && r.tree.seconds > 0)
    .map((r) => (
      <ModeStatsCard key={r.mode.id} tree={r.tree!} mode={r.mode} />
    ));

  const errorCount = results.filter((r) => r.error).length;
  const hasNoData = !loading && modeCards.length === 0 && errorCount === 0;
  const allErrored = !loading && errorCount > 0 && errorCount === results.length;

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 80 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {listHeader}
      <DateRangePicker activePreset={preset} onSelect={handlePreset} />

      {/* Range label */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        <Text style={{ fontSize: 12, color: "#9ca3af" }}>
          {preset === "allTime" ? "All time" : `${resolvedFrom} — ${resolvedTo}`}
        </Text>
      </View>

      {modesToShow.length === 0 ? (
        <View style={{ alignItems: "center", paddingTop: 60 }}>
          <Feather name="bar-chart-2" size={40} color="#d1d5db" />
          <Text style={{ color: "#9ca3af", fontSize: 16, marginTop: 12 }}>
            No modes to display
          </Text>
        </View>
      ) : loading && !refreshing ? (
        <View style={{ padding: 40, alignItems: "center" }}>
          <ActivityIndicator size="large" />
        </View>
      ) : allErrored ? (
        <View style={{ alignItems: "center", paddingTop: 40, paddingHorizontal: 20 }}>
          <Feather name="alert-circle" size={32} color="#ef4444" />
          <Text style={{ color: "#ef4444", fontSize: 14, marginTop: 8, textAlign: "center" }}>
            Failed to load stats. Pull down to retry.
          </Text>
        </View>
      ) : (
        <>
          {/* Show partial error warning if some but not all failed */}
          {errorCount > 0 && modeCards.length > 0 && (
            <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
              <Text style={{ fontSize: 12, color: "#f59e0b" }}>
                {errorCount} mode{errorCount > 1 ? "s" : ""} failed to load. Pull down to retry.
              </Text>
            </View>
          )}
          {modeCards.length > 0 ? modeCards : (
            <View style={{ alignItems: "center", paddingTop: 60 }}>
              <Feather name="bar-chart-2" size={40} color="#d1d5db" />
              <Text style={{ color: "#9ca3af", fontSize: 16, marginTop: 12 }}>
                No time tracked in this period
              </Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}
