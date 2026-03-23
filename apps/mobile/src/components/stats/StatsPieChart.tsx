import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Feather } from "@expo/vector-icons";

export type StatsPieSegment = {
  label: string;
  seconds: number;
  color?: string;
};

type Props = {
  totalSeconds: number;
  segments: StatsPieSegment[];
  color: string;
};

const OPACITIES = [1, 0.85, 0.7, 0.55, 0.4, 0.3, 0.25, 0.2];

export default function StatsPieChart({ totalSeconds, segments, color }: Props) {
  const [open, setOpen] = useState(false);

  const slices = useMemo(() => {
    if (!totalSeconds || totalSeconds <= 0) return [];
    return segments
      .filter((s) => s.seconds > 0)
      .sort((a, b) => b.seconds - a.seconds);
  }, [segments, totalSeconds]);

  if (!slices.length) return null;

  const total = slices.reduce((sum, s) => sum + s.seconds, 0);
  if (!total) return null;

  const radius = 16;
  const circumference = 2 * Math.PI * radius;

  let accumulated = 0;

  return (
    <View style={{ alignItems: "flex-end", gap: 4 }}>
      {/* Donut + toggle */}
      <TouchableOpacity
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.7}
        style={{ position: "relative", width: 64, height: 64 }}
      >
        <Svg viewBox="0 0 40 40" width={64} height={64}>
          {/* Background circle */}
          <Circle
            cx={20}
            cy={20}
            r={radius}
            fill="transparent"
            stroke="#E5E7EB"
            strokeWidth={8}
          />
          {slices.map((slice, idx) => {
            const fraction = slice.seconds / total;
            const dash = fraction * circumference;
            const gap = circumference - dash;
            const offset = accumulated;
            accumulated -= dash;

            const opacity = OPACITIES[idx] ?? OPACITIES[OPACITIES.length - 1];
            const strokeColor = slice.color ?? color;

            return (
              <Circle
                key={slice.label + idx}
                cx={20}
                cy={20}
                r={radius}
                fill="transparent"
                stroke={strokeColor}
                strokeOpacity={opacity}
                strokeWidth={8}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={offset}
                rotation={-90}
                origin="20, 20"
              />
            );
          })}
        </Svg>

        {/* Chevron badge */}
        <View
          style={{
            position: "absolute",
            bottom: -4,
            right: -4,
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: "#fff",
            borderWidth: 2,
            borderColor: color,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 1 },
            elevation: 3,
          }}
        >
          <Feather
            name={open ? "chevron-up" : "chevron-down"}
            size={16}
            color={color}
          />
        </View>
      </TouchableOpacity>

      {/* Breakdown list */}
      {open && (
        <View
          style={{
            marginTop: 4,
            borderWidth: 1,
            borderColor: "#e5e7eb",
            backgroundColor: "#f9fafb",
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            maxWidth: 220,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              color: "#6b7280",
              marginBottom: 4,
            }}
          >
            Time distribution
          </Text>
          {slices.map((slice, idx) => {
            const pct = (slice.seconds / total) * 100;
            const opacity = OPACITIES[idx] ?? OPACITIES[OPACITIES.length - 1];
            const swatchColor = slice.color ?? color;

            return (
              <View
                key={slice.label + idx}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingVertical: 2,
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    backgroundColor: swatchColor,
                    opacity,
                  }}
                />
                <Text
                  numberOfLines={1}
                  style={{ flex: 1, fontSize: 12, color: "#374151" }}
                >
                  {slice.label}
                </Text>
                <Text style={{ fontSize: 12, color: "#6b7280" }}>
                  {pct.toFixed(0)}%
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
