import React, { ReactElement, useCallback } from "react";
import { View, Text, FlatList, RefreshControl, Pressable } from "react-native";
import EntityRow from "../dashboard/EntityRow";
import FAB from "../dashboard/FAB";
import BatchActionBar from "../batch/BatchActionBar";
import { useBuildDashboardRows } from "../../hooks/useBuildDashboardRows";
import { useCollapseStore } from "../../lib/store/useCollapseStore";
import { useSelectionStore } from "../../lib/store/useSelectionStore";
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
  listHeader?: ReactElement;
};

export default function DashboardViewContent({
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
  listHeader,
}: Props) {
  const collapsed = useCollapseStore((s) => s.collapsed);
  const selectionActive = useSelectionStore((s) => s.isActive);
  const clearAll = useSelectionStore((s) => s.clearAll);

  const handleEmptyPress = useCallback(() => {
    if (selectionActive) clearAll();
  }, [selectionActive, clearAll]);

  const rows = useBuildDashboardRows(
    modes,
    goals,
    projects,
    milestones,
    tasks,
    selectedMode,
    collapsed
  );

  return (
    <>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => <EntityRow row={item} />}
        ListHeaderComponent={listHeader}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
        }
        contentContainerStyle={{
          paddingBottom: selectionActive ? 140 : 100,
          flexGrow: 1,
        }}
        ListFooterComponent={
          selectionActive ? (
            <Pressable onPress={handleEmptyPress} style={{ height: 200 }} />
          ) : undefined
        }
        ListEmptyComponent={
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              paddingTop: 80,
            }}
          >
            <Pressable onPress={handleEmptyPress} style={{ flex: 1 }}>
              <Text style={{ color: "#9ca3af", fontSize: 16 }}>
                {selectedMode === "All"
                  ? "No entities yet. Create some to get started."
                  : "Nothing here yet. Tap + to add something."}
              </Text>
            </Pressable>
          </View>
        }
      />
      {!selectionActive && (
        <FAB modeColor={modeColor} onOpenAiBuilder={onOpenAiBuilder} />
      )}
      {selectionActive && <BatchActionBar modeColor={modeColor} />}
    </>
  );
}
