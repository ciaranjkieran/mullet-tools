import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import ModeFilter from "../components/ModeFilter";
import GroupedTasks from "./GroupedTasks";
// import { Home } from "lucide-react-native"; // ✅ This works

const dummyModes = [
  { id: 1, title: "Work", color: "#3498db" },
  { id: 2, title: "Personal", color: "#e74c3c" },
  { id: 3, title: "Errands", color: "#2ecc71" },
];

export type Mode = (typeof dummyModes)[number];

export default function HomeScreen() {
  const [selectedMode, setSelectedMode] = useState<Mode | "All">("All");

  return (
    <ScrollView
      contentContainerStyle={{ paddingTop: 60, paddingHorizontal: 20 }}
    >
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}
      >
        {/* <Home size={28} color="black" style={{ marginRight: 8 }} /> */}
        <Text style={{ fontSize: 28, fontWeight: "bold" }}>Home</Text>
      </View>

      <ModeFilter
        selectedMode={selectedMode}
        setSelectedMode={setSelectedMode}
      />

      <GroupedTasks selectedMode={selectedMode} modes={dummyModes} />
    </ScrollView>
  );
}
