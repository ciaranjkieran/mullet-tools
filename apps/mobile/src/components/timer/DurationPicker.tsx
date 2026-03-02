import React from "react";
import { View, Text, TextInput } from "react-native";

type Props = {
  minutes: number;
  seconds: number;
  onChangeMinutes: (val: number) => void;
  onChangeSeconds: (val: number) => void;
  disabled: boolean;
};

export default function DurationPicker({
  minutes,
  seconds,
  onChangeMinutes,
  onChangeSeconds,
  disabled,
}: Props) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        marginBottom: 16,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <View style={{ alignItems: "center" }}>
        <TextInput
          value={String(minutes)}
          onChangeText={(t) => {
            const n = parseInt(t, 10);
            onChangeMinutes(isNaN(n) ? 0 : Math.max(0, Math.min(999, n)));
          }}
          keyboardType="number-pad"
          editable={!disabled}
          style={{
            borderWidth: 1,
            borderColor: "#d1d5db",
            borderRadius: 10,
            width: 64,
            height: 48,
            textAlign: "center",
            fontSize: 20,
            fontWeight: "600",
          }}
        />
        <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
          min
        </Text>
      </View>

      <Text style={{ fontSize: 24, fontWeight: "600", color: "#374151" }}>
        :
      </Text>

      <View style={{ alignItems: "center" }}>
        <TextInput
          value={String(seconds).padStart(2, "0")}
          onChangeText={(t) => {
            const n = parseInt(t, 10);
            onChangeSeconds(isNaN(n) ? 0 : Math.max(0, Math.min(59, n)));
          }}
          keyboardType="number-pad"
          editable={!disabled}
          style={{
            borderWidth: 1,
            borderColor: "#d1d5db",
            borderRadius: 10,
            width: 64,
            height: 48,
            textAlign: "center",
            fontSize: 20,
            fontWeight: "600",
          }}
        />
        <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
          sec
        </Text>
      </View>
    </View>
  );
}
