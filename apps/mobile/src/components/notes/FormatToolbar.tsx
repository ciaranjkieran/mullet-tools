import React from "react";
import { View, TouchableOpacity, Text } from "react-native";

type Props = {
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  modeColor?: string;
};

export default function FormatToolbar({
  onBold,
  onItalic,
  onUnderline,
  modeColor = "#374151",
}: Props) {
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 4,
        marginBottom: 6,
      }}
    >
      <TouchableOpacity
        onPress={onBold}
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          backgroundColor: "#f3f4f6",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ fontWeight: "800", fontSize: 15, color: modeColor }}>B</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onItalic}
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          backgroundColor: "#f3f4f6",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ fontStyle: "italic", fontWeight: "600", fontSize: 15, color: modeColor }}>
          I
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onUnderline}
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          backgroundColor: "#f3f4f6",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            textDecorationLine: "underline",
            fontWeight: "600",
            fontSize: 15,
            color: modeColor,
          }}
        >
          U
        </Text>
      </TouchableOpacity>
    </View>
  );
}
