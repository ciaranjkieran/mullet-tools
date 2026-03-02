import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

type Preset = "today" | "thisWeek" | "thisMonth" | "allTime";

type Props = {
  activePreset: Preset;
  onSelect: (preset: Preset, from: string, to: string) => void;
};

function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

const PRESETS: { key: Preset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "thisWeek", label: "Week" },
  { key: "thisMonth", label: "Month" },
  { key: "allTime", label: "All" },
];

export default function DateRangePicker({ activePreset, onSelect }: Props) {
  const handleSelect = (preset: Preset) => {
    const now = new Date();
    let from: string;
    let to: string;

    switch (preset) {
      case "today":
        from = to = todayStr();
        break;
      case "thisWeek":
        from = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
        to = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
        break;
      case "thisMonth":
        from = format(startOfMonth(now), "yyyy-MM-dd");
        to = format(endOfMonth(now), "yyyy-MM-dd");
        break;
      case "allTime":
        from = "";
        to = "";
        break;
    }

    onSelect(preset, from, to);
  };

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: "#f3f4f6",
        borderRadius: 10,
        padding: 3,
        marginHorizontal: 20,
        marginVertical: 8,
      }}
    >
      {PRESETS.map((p) => (
        <TouchableOpacity
          key={p.key}
          onPress={() => handleSelect(p.key)}
          style={{
            flex: 1,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor:
              activePreset === p.key ? "#fff" : "transparent",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: activePreset === p.key ? "600" : "400",
              color: activePreset === p.key ? "#111" : "#6b7280",
            }}
          >
            {p.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
