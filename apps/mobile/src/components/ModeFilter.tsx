import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { getContrastingText } from "@shared/utils/getContrastingText";
import type { Mode } from "@shared/types/Mode";

type Props = {
  modes: Mode[];
  selectedMode: Mode | "All";
  setSelectedMode: (mode: Mode | "All") => void;
  onLongPressMode?: (mode: Mode) => void;
};

export default function ModeFilter({ modes, selectedMode, setSelectedMode, onLongPressMode }: Props) {
  const [isModeFocus, setIsModeFocus] = React.useState(false);

  const modesToShow =
    selectedMode === "All" || !isModeFocus
      ? modes
      : modes.filter((m) => m.id === selectedMode.id);

  return (
    <View style={{ paddingTop: 4, paddingBottom: 12, paddingHorizontal: 20 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
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
            const hasCollaborators = mode.collaboratorCount > 0;

            return (
              <TouchableOpacity
                key={mode.id}
                onPress={() => setSelectedMode(mode)}
                onLongPress={() => onLongPressMode?.(mode)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: isActive ? mode.color : "#f3f4f6",
                  borderWidth: 1,
                  borderColor: isActive ? mode.color : "#d1d5db",
                  gap: 4,
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
                {hasCollaborators && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                    <Feather
                      name="users"
                      size={12}
                      color={isActive ? getContrastingText(mode.color) : "#9ca3af"}
                    />
                    <Text
                      style={{
                        fontSize: 11,
                        color: isActive ? getContrastingText(mode.color) : "#9ca3af",
                        fontWeight: "500",
                      }}
                    >
                      {mode.collaboratorCount}
                    </Text>
                  </View>
                )}
                {!mode.isOwned && (
                  <Feather
                    name="user"
                    size={11}
                    color={isActive ? getContrastingText(mode.color) : "#d1d5db"}
                  />
                )}
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
    </View>
  );
}
