import React from "react";
import { View } from "react-native";
import { Feather } from "@expo/vector-icons";

type Props = {
  type: "goal" | "project" | "milestone" | "task" | string;
  color: string;
  size?: number;
};

/**
 * Renders the canonical icon for each entity type, matching web:
 *  - Goal:      target (bullseye)
 *  - Project:   folder (filled)
 *  - Milestone: triangle shape
 *  - Task:      colored dot
 */
export default function EntityIcon({ type, color, size = 20 }: Props) {
  if (type === "task") {
    const dotSize = Math.round(size * 0.5);
    return (
      <View style={{ width: size, height: size, justifyContent: "center", alignItems: "center" }}>
        <View style={{ width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: color }} />
      </View>
    );
  }

  if (type === "milestone") {
    const triW = Math.round(size * 0.35);
    const triH = Math.round(size * 0.6);
    return (
      <View style={{ width: size, height: size, justifyContent: "center", alignItems: "center" }}>
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: triW,
            borderRightWidth: triW,
            borderTopWidth: triH,
            borderLeftColor: "transparent",
            borderRightColor: "transparent",
            borderTopColor: color,
          }}
        />
      </View>
    );
  }

  if (type === "project") {
    const s = Math.round(size * 0.9);
    const tabW = Math.round(s * 0.42);
    const tabH = Math.round(s * 0.22);
    const bodyH = Math.round(s * 0.6);
    const r = Math.round(s * 0.12);
    return (
      <View style={{ width: size, height: size, justifyContent: "center", alignItems: "center" }}>
        {/* Tab */}
        <View
          style={{
            width: tabW,
            height: tabH,
            backgroundColor: color,
            borderTopLeftRadius: r,
            borderTopRightRadius: r,
            alignSelf: "flex-start",
            marginLeft: Math.round(s * 0.05),
          }}
        />
        {/* Body */}
        <View
          style={{
            width: s,
            height: bodyH,
            backgroundColor: color,
            borderRadius: r,
            marginTop: -1,
          }}
        />
      </View>
    );
  }

  // goal (default)
  return <Feather name="target" size={Math.round(size * 0.9)} color={color} />;
}
