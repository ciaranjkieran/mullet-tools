import React from "react";
import { Text, View } from "react-native";
import { Mode } from "../screens/HomeScreen";

const dummyTasks = [
  { id: 1, title: "Finish report", modeId: 1 },
  { id: 2, title: "Email client", modeId: 1 },
  { id: 3, title: "Call mom", modeId: 2 },
  { id: 4, title: "Plan trip", modeId: 2 },
  { id: 5, title: "Buy groceries", modeId: 3 },
];

type Props = {
  selectedMode: Mode | "All";
  modes: Mode[];
};

export default function GroupedTasks({ selectedMode, modes }: Props) {
  const activeModes =
    selectedMode === "All"
      ? modes
      : modes.filter((mode) => mode.id === selectedMode.id);

  return (
    <View style={{ marginTop: 20 }}>
      {activeModes.map((mode) => {
        const tasks = dummyTasks.filter((t) => t.modeId === mode.id);
        if (tasks.length === 0) return null;

        return (
          <View key={mode.id} style={{ marginBottom: 32 }}>
            {selectedMode === "All" && (
              <Text
                style={{
                  fontWeight: "600",
                  fontSize: 14,
                  marginBottom: 16,
                  paddingLeft: 4,
                  borderLeftWidth: 4,
                  borderLeftColor: mode.color,
                  paddingVertical: 2,
                }}
              >
              {' '}{mode.title}
              </Text>
            )}

            {tasks.map((task) => (
              <View
                key={task.id}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  backgroundColor: "#f9fafb",
                  borderRadius: 8,
                  marginBottom: 8,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: mode.color,
                      marginRight: 8,
                    }}
                  />
                  <Text>{task.title}</Text>
                </View>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}
