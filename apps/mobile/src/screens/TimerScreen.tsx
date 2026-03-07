import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TimerViewContent from "../components/views/TimerViewContent";

export default function TimerScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top", "left", "right"]}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 24, fontWeight: "bold" }}>Timer</Text>
      </View>
      <TimerViewContent />
    </SafeAreaView>
  );
}
