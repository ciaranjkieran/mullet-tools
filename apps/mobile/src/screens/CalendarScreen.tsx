import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useModes } from "@shared/api/hooks/modes/useModes";
import { useGoals } from "@shared/api/hooks/goals/useGoals";
import { useProjects } from "@shared/api/hooks/projects/useProjects";
import { useMilestones } from "@shared/api/hooks/milestones/useMilestones";
import { useTasks } from "@shared/api/hooks/tasks/useTasks";
import { useModeStore } from "@shared/store/useModeStore";
import ModeFilter from "../components/ModeFilter";
import CalendarViewContent from "../components/views/CalendarViewContent";

export default function CalendarScreen() {
  const modesQ = useModes();
  const goalsQ = useGoals();
  const projectsQ = useProjects();
  const milestonesQ = useMilestones();
  const tasksQ = useTasks();

  const modes = useModeStore((s) => s.modes);
  const selectedMode = useModeStore((s) => s.selectedMode);
  const setSelectedMode = useModeStore((s) => s.setSelectedMode);

  const isLoading =
    modesQ.isLoading ||
    goalsQ.isLoading ||
    projectsQ.isLoading ||
    milestonesQ.isLoading ||
    tasksQ.isLoading;

  if (isLoading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <Text style={{ fontSize: 24, fontWeight: "bold" }}>Calendar</Text>
      </View>

      <ModeFilter
        modes={modes}
        selectedMode={selectedMode}
        setSelectedMode={setSelectedMode}
      />

      <CalendarViewContent />
    </SafeAreaView>
  );
}
