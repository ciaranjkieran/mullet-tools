import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { getContrastingText } from "@shared/utils/getContrastingText"; // assuming alias works

type Mode = {
  id: number;
  title: string;
  color: string;
};

const dummyModes: Mode[] = [
  { id: 1, title: "Work", color: "#3498db" },
  { id: 2, title: "Personal", color: "#e74c3c" },
  { id: 3, title: "Errands", color: "#2ecc71" },
];

type Props = {
  selectedMode: Mode | "All";
  setSelectedMode: (mode: Mode | "All") => void;
};

export default function ModeFilter({ selectedMode, setSelectedMode }: Props) {
  const [isModeFocus, setIsModeFocus] = React.useState(false);

  const modesToShow =
    selectedMode === "All" || !isModeFocus
      ? dummyModes
      : dummyModes.filter((m) => m.id === selectedMode.id);

  return (
    <View style={{ paddingVertical: 8 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {!isModeFocus && (
            <TouchableOpacity
              onPress={() => setSelectedMode("All")}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: selectedMode === "All" ? "#000" : "#f3f4f6",
                borderWidth: 1,
                borderColor: selectedMode === "All" ? "#000" : "#d1d5db",
              }}
            >
              <Text
                style={{
                  color: selectedMode === "All" ? "#fff" : "#111",
                  fontWeight: "500",
                }}
              >
                All
              </Text>
            </TouchableOpacity>
          )}

          {modesToShow.map((mode) => {
            const isActive =
              selectedMode !== "All" && selectedMode.id === mode.id;

            return (
              <TouchableOpacity
                key={mode.id}
                onPress={() => setSelectedMode(mode)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: isActive ? mode.color : "#f3f4f6",
                  borderWidth: 1,
                  borderColor: isActive ? mode.color : "#d1d5db",
                }}
              >
                <Text
                  style={{
                    color: isActive ? getContrastingText(mode.color) : "#111",
                    fontWeight: "500",
                  }}
                >
                  {mode.title}
                </Text>
              </TouchableOpacity>
            );
          })}

          {selectedMode !== "All" && (
            <TouchableOpacity
              onPress={() => setIsModeFocus((prev) => !prev)}
              style={{
                marginLeft: 4,
                padding: 6,
                borderRadius: 4,
              }}
            >
              {isModeFocus ? (
                <Feather name="x" size={20} color="#047857" />
              ) : (
                <Feather name="crosshair" size={20} color="#047857" />
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
