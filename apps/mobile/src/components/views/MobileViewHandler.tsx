import React from "react";
import { View, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useViewStore } from "@shared/store/useViewStore";
import { useModeStore } from "@shared/store/useModeStore";
import ViewButtons from "./ViewButtons";
import ModeFilter from "../ModeFilter";
import DashboardViewContent from "./DashboardViewContent";
import CalendarViewContent from "./CalendarViewContent";
import TimerViewContent from "./TimerViewContent";
import StatsViewContent from "./StatsViewContent";
import TemplatesViewContent from "./TemplatesViewContent";
import ModeCommentsView from "./ModeCommentsView";
import ModeNotesView from "./ModeNotesView";
import BoardsView from "../dashboard/BoardsView";
import type { Mode } from "@shared/types/Mode";
import type { Goal } from "@shared/types/Goal";
import type { Project } from "@shared/types/Project";
import type { Milestone } from "@shared/types/Milestone";
import type { Task } from "@shared/types/Task";

type Props = {
  modes: Mode[];
  selectedMode: Mode | "All";
  goals: Goal[];
  projects: Project[];
  milestones: Milestone[];
  tasks: Task[];
  onRefresh: () => void;
  isRefetching: boolean;
  modeColor: string;
  onOpenAiBuilder: () => void;
  onLongPressMode?: (mode: Mode) => void;
  pageTitle: string;
  headerRight?: React.ReactNode;
};

/**
 * Header that scrolls with content — ViewButtons + ModeFilter.
 * Passed as ListHeaderComponent to FlatList/SectionList views,
 * or rendered at the top of ScrollView views.
 */
function HomeHeader({
  modeColor,
  modes,
  selectedMode,
  setSelectedMode,
  onLongPressMode,
  pageTitle,
  headerRight,
}: {
  modeColor: string;
  modes: Mode[];
  selectedMode: Mode | "All";
  setSelectedMode: (mode: Mode | "All") => void;
  onLongPressMode?: (mode: Mode) => void;
  pageTitle: string;
  headerRight?: React.ReactNode;
}) {
  return (
    <View>
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 8,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ fontSize: 34, fontWeight: "bold", color: "#111" }}>{pageTitle}</Text>
        {headerRight}
      </View>
      <ViewButtons modeColor={modeColor} />
      <ModeFilter
        modes={modes}
        selectedMode={selectedMode}
        setSelectedMode={setSelectedMode}
        onLongPressMode={onLongPressMode}
      />
    </View>
  );
}

export default function MobileViewHandler({
  modes,
  selectedMode,
  goals,
  projects,
  milestones,
  tasks,
  onRefresh,
  isRefetching,
  modeColor,
  onOpenAiBuilder,
  onLongPressMode,
  pageTitle,
  headerRight,
}: Props) {
  const viewType = useViewStore((s) => s.viewType);
  const setSelectedMode = useModeStore((s) => s.setSelectedMode);
  const view = viewType === "dashboard" ? "home" : viewType;

  const headerElement = (
    <HomeHeader
      modeColor={modeColor}
      modes={modes}
      selectedMode={selectedMode}
      setSelectedMode={setSelectedMode}
      onLongPressMode={onLongPressMode}
      pageTitle={pageTitle}
      headerRight={headerRight}
    />
  );

  if (view === "home") {
    return (
      <DashboardViewContent
        modes={modes}
        selectedMode={selectedMode}
        goals={goals}
        projects={projects}
        milestones={milestones}
        tasks={tasks}
        onRefresh={onRefresh}
        isRefetching={isRefetching}
        modeColor={modeColor}
        onOpenAiBuilder={onOpenAiBuilder}
        listHeader={headerElement}
      />
    );
  }

  if (view === "calendar") {
    return <CalendarViewContent listHeader={headerElement} />;
  }

  if (view === "comments") {
    return (
      <ModeCommentsView
        modes={modes}
        selectedMode={selectedMode}
        goals={goals}
        projects={projects}
        milestones={milestones}
        tasks={tasks}
        modeColor={modeColor}
        listHeader={headerElement}
      />
    );
  }

  if (view === "notes") {
    return (
      <ModeNotesView
        modes={modes}
        selectedMode={selectedMode}
        goals={goals}
        projects={projects}
        milestones={milestones}
        tasks={tasks}
        modeColor={modeColor}
        listHeader={headerElement}
      />
    );
  }

  if (view === "boards") {
    if (selectedMode === "All") {
      return (
        <View style={{ flex: 1 }}>
          {headerElement}
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              paddingTop: 40,
            }}
          >
            <Feather name="grid" size={40} color="#d1d5db" />
            <Text style={{ color: "#9ca3af", fontSize: 16, marginTop: 12 }}>
              Select a mode to view boards
            </Text>
          </View>
        </View>
      );
    }
    return (
      <View style={{ flex: 1 }}>
        {headerElement}
        <BoardsView
          modeId={(selectedMode as Mode).id}
          modeColor={(selectedMode as Mode).color}
        />
      </View>
    );
  }

  if (view === "templates") {
    return (
      <TemplatesViewContent
        modes={modes}
        selectedMode={selectedMode}
        listHeader={headerElement}
      />
    );
  }

  if (view === "stats") {
    return (
      <StatsViewContent
        modes={modes}
        selectedMode={selectedMode}
        listHeader={headerElement}
      />
    );
  }

  if (view === "timer") {
    return <TimerViewContent listHeader={headerElement} />;
  }

  // Fallback
  return (
    <DashboardViewContent
      modes={modes}
      selectedMode={selectedMode}
      goals={goals}
      projects={projects}
      milestones={milestones}
      tasks={tasks}
      onRefresh={onRefresh}
      isRefetching={isRefetching}
      modeColor={modeColor}
      onOpenAiBuilder={onOpenAiBuilder}
      listHeader={headerElement}
    />
  );
}
