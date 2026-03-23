import React from "react";
import { View, Text } from "react-native";
import EntityIcon from "../EntityIcon";
import type { StatsNode } from "@shared/types/Stats";

type EntityKind = "mode" | "goal" | "project" | "milestone" | "task";

type Props = {
  node: StatsNode;
  kind: EntityKind;
  parentTitle?: string | null;
  modeColor: string;
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export default function StatsNodeCard({
  node,
  kind,
  parentTitle,
  modeColor,
}: Props) {
  const seconds = node.selfSeconds ?? 0;
  const hours = seconds / 3600;

  // Vertical hour bars: 1 full bar per hour, 1 partial for remainder
  const fullBars = Math.floor(hours);
  const fractional = hours - fullBars;

  const barDefs: { key: string; heightPercent: number }[] = [];

  if (hours > 0) {
    for (let i = 0; i < fullBars; i++) {
      barDefs.push({ key: `full-${i}`, heightPercent: 100 });
    }
    if (fractional > 0) {
      barDefs.push({ key: "partial", heightPercent: fractional * 100 });
    }
    if (barDefs.length === 0) {
      barDefs.push({ key: "subhour", heightPercent: Math.min(hours * 100, 100) });
    }
  }

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 8,
        paddingHorizontal: 4,
      }}
    >
      {/* LEFT: icon + title | parent */}
      <View style={{ flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0 }}>
        {kind === "mode" ? (
          <View
            style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              backgroundColor: modeColor,
              marginRight: 8,
            }}
          />
        ) : (
          <View style={{ marginRight: 8 }}>
            <EntityIcon type={kind} size={16} color={modeColor} />
          </View>
        )}

        <Text style={{ flex: 1, flexWrap: "wrap" }}>
          <Text style={{ fontSize: 16, fontWeight: "500", color: "#111" }}>
            {node.title || "Untitled"}
          </Text>
          {parentTitle ? (
            <Text style={{ fontSize: 15, color: "#9ca3af" }}>
              {"  |  "}
              <Text style={{ color: "#6b7280" }}>{parentTitle}</Text>
            </Text>
          ) : null}
        </Text>
      </View>

      {/* RIGHT: duration + hour bars */}
      <View style={{ alignItems: "flex-end", marginLeft: 8, flexShrink: 0 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: "#111",
          }}
        >
          {formatDuration(seconds)}
        </Text>

        {barDefs.length > 0 && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              gap: 2,
              marginTop: 4,
            }}
          >
            {barDefs.map((bar) => (
              <View
                key={bar.key}
                style={{
                  width: 5,
                  height: 14,
                  borderRadius: 3,
                  backgroundColor: "#f3f4f6",
                  overflow: "hidden",
                  justifyContent: "flex-end",
                }}
              >
                <View
                  style={{
                    width: 5,
                    height: `${bar.heightPercent}%`,
                    borderRadius: 3,
                    backgroundColor: modeColor,
                  }}
                />
              </View>
            ))}
            <Text
              style={{
                fontSize: 10,
                color: "#9ca3af",
                marginLeft: 2,
              }}
            >
              {hours.toFixed(1)}h
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
