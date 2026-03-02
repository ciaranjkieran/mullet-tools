import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { Kind } from "@shared/types/Timer";

type Props = {
  clockType: Kind;
  setClockType: (kind: Kind) => void;
  disabled: boolean;
};

export default function TimerModeToggle({
  clockType,
  setClockType,
  disabled,
}: Props) {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: "#f3f4f6",
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
      }}
    >
      <TouchableOpacity
        onPress={() => setClockType("stopwatch")}
        disabled={disabled}
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 10,
          borderRadius: 8,
          backgroundColor:
            clockType === "stopwatch" ? "#fff" : "transparent",
          gap: 6,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Feather name="watch" size={16} color="#374151" />
        <Text style={{ fontWeight: "600", color: "#374151" }}>Stopwatch</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setClockType("timer")}
        disabled={disabled}
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 10,
          borderRadius: 8,
          backgroundColor:
            clockType === "timer" ? "#fff" : "transparent",
          gap: 6,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Feather name="clock" size={16} color="#374151" />
        <Text style={{ fontWeight: "600", color: "#374151" }}>Timer</Text>
      </TouchableOpacity>
    </View>
  );
}
