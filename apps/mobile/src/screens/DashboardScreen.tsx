import React, { useCallback, useState } from "react";
import { View, ActivityIndicator, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useModes } from "@shared/api/hooks/modes/useModes";
import { useGoals } from "@shared/api/hooks/goals/useGoals";
import { useProjects } from "@shared/api/hooks/projects/useProjects";
import { useMilestones } from "@shared/api/hooks/milestones/useMilestones";
import { useTasks } from "@shared/api/hooks/tasks/useTasks";
import { useModeStore } from "@shared/store/useModeStore";
import { useGoalStore } from "@shared/store/useGoalStore";
import { useProjectStore } from "@shared/store/useProjectStore";
import { useMilestoneStore } from "@shared/store/useMilestoneStore";
import { useTaskStore } from "@shared/store/useTaskStore";
import { useViewStore } from "@shared/store/useViewStore";
import MobileViewHandler from "../components/views/MobileViewHandler";
import EntityFormModal from "../components/dashboard/EntityFormModal";
import AiBuilderModal from "../components/ai/AiBuilderModal";
import ModeCollaborationModal from "../components/collaboration/ModeCollaborationModal";
import TrialBanner from "../components/billing/TrialBanner";
import OfflineBanner from "../components/OfflineBanner";
import { useEntityFormStore } from "../lib/store/useEntityFormStore";
import type { Mode } from "@shared/types/Mode";

const VIEW_TITLES: Record<string, string> = {
  dashboard: "Home",
  calendar: "Calendar",
  comments: "Comments",
  notes: "Notes",
  boards: "Boards",
  templates: "Templates",
  stats: "Stats",
  timer: "Timer",
};

export default function DashboardScreen() {
  // Fire all fetch hooks — they auto-sync to Zustand stores
  const modesQ = useModes();
  const goalsQ = useGoals();
  const projectsQ = useProjects();
  const milestonesQ = useMilestones();
  const tasksQ = useTasks();

  // Read from stores
  const modes = useModeStore((s) => s.modes);
  const selectedMode = useModeStore((s) => s.selectedMode);
  const setSelectedMode = useModeStore((s) => s.setSelectedMode);
  const goals = useGoalStore((s) => s.goals);
  const projects = useProjectStore((s) => s.projects);
  const milestones = useMilestoneStore((s) => s.milestones);
  const tasks = useTaskStore((s) => s.tasks);
  const viewType = useViewStore((s) => s.viewType);

  const formStore = useEntityFormStore();
  const [collabMode, setCollabMode] = useState<Mode | null>(null);
  const [aiBuilderOpen, setAiBuilderOpen] = useState(false);

  const isLoading =
    modesQ.isLoading ||
    goalsQ.isLoading ||
    projectsQ.isLoading ||
    milestonesQ.isLoading ||
    tasksQ.isLoading;

  const isRefetching =
    modesQ.isRefetching ||
    goalsQ.isRefetching ||
    projectsQ.isRefetching ||
    milestonesQ.isRefetching ||
    tasksQ.isRefetching;

  const onRefresh = useCallback(() => {
    modesQ.refetch();
    goalsQ.refetch();
    projectsQ.refetch();
    milestonesQ.refetch();
    tasksQ.refetch();
  }, [modesQ, goalsQ, projectsQ, milestonesQ, tasksQ]);

  const firstMode = modes[0];
  const modeColor =
    selectedMode === "All" ? (firstMode?.color ?? "#000") : (selectedMode as Mode).color;
  const activeModeId =
    selectedMode === "All" ? (firstMode?.id ?? 0) : (selectedMode as Mode).id;
  const activeModeTitle =
    selectedMode === "All" ? (firstMode?.title ?? "") : (selectedMode as Mode).title;

  const pageTitle = VIEW_TITLES[viewType] ?? "Home";

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

  const headerRight = selectedMode !== "All" ? (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <TouchableOpacity
        onPress={() => setCollabMode(selectedMode as Mode)}
        style={{
          padding: 6,
          borderRadius: 20,
          borderWidth: 1.5,
          borderColor: modeColor,
          backgroundColor: modeColor + "18",
        }}
      >
        <Feather name="users" size={16} color={modeColor} />
      </TouchableOpacity>
    </View>
  ) : undefined;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top", "left", "right"]}>
      <OfflineBanner />
      <TrialBanner />

      {/* View Content — title, ViewButtons + ModeFilter all scroll with content */}
      <View style={{ flex: 1 }}>
        <MobileViewHandler
          modes={modes}
          selectedMode={selectedMode}
          goals={goals}
          projects={projects}
          milestones={milestones}
          tasks={tasks}
          onRefresh={onRefresh}
          isRefetching={isRefetching}
          modeColor={modeColor}
          onOpenAiBuilder={() => setAiBuilderOpen(true)}
          onLongPressMode={(mode) => setCollabMode(mode)}
          pageTitle={pageTitle}
          headerRight={headerRight}
        />
      </View>

      {/* Global modals */}
      <EntityFormModal
        visible={formStore.visible}
        onClose={formStore.close}
        entityType={formStore.entityType}
        editEntity={formStore.editEntity}
        defaultModeId={activeModeId}
      />

      {collabMode && (
        <ModeCollaborationModal
          visible={!!collabMode}
          onClose={() => setCollabMode(null)}
          modeId={collabMode.id}
          modeTitle={collabMode.title}
          modeColor={collabMode.color}
          isOwner={collabMode.isOwned}
        />
      )}

      <AiBuilderModal
        visible={aiBuilderOpen}
        onClose={() => setAiBuilderOpen(false)}
        modeId={activeModeId}
        modeTitle={activeModeTitle}
        modeColor={modeColor}
      />
    </SafeAreaView>
  );
}
