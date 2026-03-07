import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { format, parseISO, isBefore, startOfDay } from "date-fns";
import { useModes } from "@shared/api/hooks/modes/useModes";
import { useGoals } from "@shared/api/hooks/goals/useGoals";
import { useProjects } from "@shared/api/hooks/projects/useProjects";
import { useMilestones } from "@shared/api/hooks/milestones/useMilestones";
import { useTasks } from "@shared/api/hooks/tasks/useTasks";
import { useBulkMoveTasks } from "@shared/api/hooks/tasks/useBulkMoveTasks";
import { useBulkMoveGoals } from "@shared/api/hooks/goals/useBulkMoveGoals";
import { useBulkMoveProjects } from "@shared/api/hooks/projects/useBulkMoveProjects";
import { useBulkMoveMilestones } from "@shared/api/hooks/milestones/useBulkMoveMilestones";
import { useModeStore } from "@shared/store/useModeStore";
import { useGoalStore } from "@shared/store/useGoalStore";
import { useProjectStore } from "@shared/store/useProjectStore";
import { useMilestoneStore } from "@shared/store/useMilestoneStore";
import { useTaskStore } from "@shared/store/useTaskStore";
import ViewButtons from "../components/views/ViewButtons";
import ModeFilter from "../components/ModeFilter";
import CalendarDayItem from "../components/calendar/CalendarDayItem";
import AddTaskInlineCalendar from "../components/calendar/AddTaskInlineCalendar";
import EntityFormModal from "../components/dashboard/EntityFormModal";
import FAB from "../components/dashboard/FAB";
import BatchActionBar from "../components/batch/BatchActionBar";
import AiBuilderModal from "../components/ai/AiBuilderModal";
import { textLine } from "../lib/styles/platform";
import { useEntityFormStore } from "../lib/store/useEntityFormStore";
import { useSelectionStore } from "../lib/store/useSelectionStore";
import type { CalendarEntity } from "../components/views/CalendarViewContent";
import type { Mode } from "@shared/types/Mode";
import type { Goal } from "@shared/types/Goal";
import type { Project } from "@shared/types/Project";
import type { Milestone } from "@shared/types/Milestone";
import type { Task } from "@shared/types/Task";

type TodaySection = {
  title: string;
  dateKey: string;
  isPastDue: boolean;
  itemCount: number;
  data: CalendarEntity[];
};

export default function TodayScreen() {
  const navigation = useNavigation<any>();
  const [pastDueCollapsed, setPastDueCollapsed] = useState(false);
  const [movingToToday, setMovingToToday] = useState(false);
  const [sortByTime, setSortByTime] = useState(false);
  const selectionActive = useSelectionStore((s) => s.isActive);

  const bulkMoveTasks = useBulkMoveTasks();
  const bulkMoveGoals = useBulkMoveGoals();
  const bulkMoveProjects = useBulkMoveProjects();
  const bulkMoveMilestones = useBulkMoveMilestones();

  useModes();
  useGoals();
  useProjects();
  useMilestones();
  useTasks();

  const modes = useModeStore((s) => s.modes);
  const selectedMode = useModeStore((s) => s.selectedMode);
  const setSelectedMode = useModeStore((s) => s.setSelectedMode);
  const goals = useGoalStore((s) => s.goals);
  const projects = useProjectStore((s) => s.projects);
  const milestones = useMilestoneStore((s) => s.milestones);
  const tasks = useTaskStore((s) => s.tasks);
  const formStore = useEntityFormStore();
  const [aiBuilderOpen, setAiBuilderOpen] = useState(false);

  const firstMode = modes[0];
  const modeColor =
    selectedMode === "All" ? (firstMode?.color ?? "#000") : (selectedMode as Mode).color;

  const isLoading =
    useModes().isLoading ||
    useGoals().isLoading ||
    useProjects().isLoading ||
    useMilestones().isLoading ||
    useTasks().isLoading;

  const modeColorMap = useMemo(() => {
    const m: Record<number, string> = {};
    for (const mode of modes) m[mode.id] = mode.color;
    return m;
  }, [modes]);

  const modePositionMap = useMemo(() => {
    const m: Record<number, number> = {};
    for (const mode of modes) m[mode.id] = mode.position;
    return m;
  }, [modes]);

  const modeTitleMap = useMemo(() => {
    const m: Record<number, string> = {};
    for (const mode of modes) m[mode.id] = mode.title;
    return m;
  }, [modes]);

  const goalMap = useMemo(() => Object.fromEntries(goals.map((g) => [g.id, g])), [goals]);
  const projectMap = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects]);
  const milestoneMap = useMemo(() => Object.fromEntries(milestones.map((m) => [m.id, m])), [milestones]);

  const allEntities = useMemo(() => {
    const entities: CalendarEntity[] = [];
    const modeFilter =
      selectedMode === "All" ? null : (selectedMode as Mode).id;
    const isAll = selectedMode === "All";

    const getParentTitle = (type: CalendarEntity["type"], item: any): string | undefined => {
      if (type === "task") {
        if (item.milestoneId) return milestoneMap[item.milestoneId]?.title;
        if (item.projectId) return projectMap[item.projectId]?.title;
        if (item.goalId) return goalMap[item.goalId]?.title;
      } else if (type === "milestone") {
        if (item.projectId) return projectMap[item.projectId]?.title;
        if (item.goalId) return goalMap[item.goalId]?.title;
      } else if (type === "project") {
        if (item.parentId) return projectMap[item.parentId]?.title;
        if (item.goalId) return goalMap[item.goalId]?.title;
      }
      return undefined;
    };

    const addEntity = (
      type: CalendarEntity["type"],
      item: Goal | Project | Milestone | Task
    ) => {
      if (!item.dueDate) return;
      if (modeFilter && item.modeId !== modeFilter) return;
      entities.push({
        id: item.id,
        type,
        title: item.title,
        dueDate: item.dueDate,
        dueTime: (item as any).dueTime ?? null,
        isCompleted: item.isCompleted,
        modeId: item.modeId,
        modeColor: modeColorMap[item.modeId] ?? "#6b7280",
        modeTitle: isAll ? modeTitleMap[item.modeId] : undefined,
        parentTitle: getParentTitle(type, item),
      });
    };

    goals.forEach((g) => addEntity("goal", g));
    projects.forEach((p) => addEntity("project", p));
    milestones.forEach((m) => addEntity("milestone", m));
    tasks.forEach((t) => addEntity("task", t));

    return entities;
  }, [goals, projects, milestones, tasks, selectedMode, modeColorMap, modeTitleMap, goalMap, projectMap, milestoneMap]);

  const today = useMemo(() => startOfDay(new Date()), []);
  const todayStr = useMemo(() => format(today, "yyyy-MM-dd"), [today]);
  const todayLabel = useMemo(() => format(today, "EEEE, MMM d"), [today]);

  // Lower entities first: task=0, milestone=1, project=2, goal=3
  const TYPE_RANK: Record<string, number> = { task: 0, milestone: 1, project: 2, goal: 3 };

  const sortEntities = useCallback(
    (items: CalendarEntity[]) => {
      return [...items].sort((a, b) => {
        if (sortByTime) {
          // Time toggle: all timed items first sorted by time, then non-timed
          const aHasTime = !!a.dueTime;
          const bHasTime = !!b.dueTime;
          if (aHasTime !== bHasTime) return aHasTime ? -1 : 1;
          if (aHasTime && bHasTime) {
            const cmp = a.dueTime!.localeCompare(b.dueTime!);
            if (cmp !== 0) return cmp;
          }
        }
        // Group by mode
        const modeA = modePositionMap[a.modeId] ?? 999;
        const modeB = modePositionMap[b.modeId] ?? 999;
        if (modeA !== modeB) return modeA - modeB;
        // Within a mode: timed items first
        const aHasTime = !!a.dueTime;
        const bHasTime = !!b.dueTime;
        if (aHasTime !== bHasTime) return aHasTime ? -1 : 1;
        if (aHasTime && bHasTime) {
          const cmp = a.dueTime!.localeCompare(b.dueTime!);
          if (cmp !== 0) return cmp;
        }
        // Entity type rank
        const typeA = TYPE_RANK[a.type] ?? 9;
        const typeB = TYPE_RANK[b.type] ?? 9;
        if (typeA !== typeB) return typeA - typeB;
        return a.title.localeCompare(b.title);
      });
    },
    [sortByTime, modePositionMap]
  );

  const { sections, pastDueEntities } = useMemo(() => {
    const pastDue: CalendarEntity[] = [];
    const todayItems: CalendarEntity[] = [];

    for (const entity of allEntities) {
      if (entity.isCompleted) continue;
      if (isBefore(parseISO(entity.dueDate), today)) {
        pastDue.push(entity);
      } else if (entity.dueDate === todayStr) {
        todayItems.push(entity);
      }
    }

    const sortedPastDue = sortEntities(pastDue);
    const sortedToday = sortEntities(todayItems);
    const result: TodaySection[] = [];

    if (sortedPastDue.length > 0) {
      result.push({
        title: "Past Due",
        dateKey: "past-due",
        isPastDue: true,
        itemCount: sortedPastDue.length,
        data: pastDueCollapsed ? [] : sortedPastDue,
      });
    }

    result.push({
      title: todayLabel,
      dateKey: todayStr,
      isPastDue: false,
      itemCount: sortedToday.length,
      data: sortedToday,
    });

    return { sections: result, pastDueEntities: sortedPastDue };
  }, [allEntities, today, todayStr, todayLabel, pastDueCollapsed, sortEntities]);

  const activeModeId =
    selectedMode === "All" ? (firstMode?.id ?? 0) : (selectedMode as Mode).id;
  const activeModeTitle =
    selectedMode === "All" ? (firstMode?.title ?? "") : (selectedMode as Mode).title;

  const handleMoveAllToToday = useCallback(() => {
    if (pastDueEntities.length === 0) return;

    Alert.alert(
      "Move All to Today",
      `Reschedule ${pastDueEntities.length} past due item${pastDueEntities.length > 1 ? "s" : ""} to today?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Move",
          onPress: async () => {
            setMovingToToday(true);
            try {
              const taskIds = pastDueEntities.filter((e) => e.type === "task").map((e) => e.id);
              const goalIds = pastDueEntities.filter((e) => e.type === "goal").map((e) => e.id);
              const projectIds = pastDueEntities.filter((e) => e.type === "project").map((e) => e.id);
              const milestoneIds = pastDueEntities.filter((e) => e.type === "milestone").map((e) => e.id);

              const promises: Promise<unknown>[] = [];
              if (taskIds.length > 0) promises.push(bulkMoveTasks.mutateAsync({ taskIds, dueDate: todayStr }));
              if (goalIds.length > 0) promises.push(bulkMoveGoals.mutateAsync({ goalIds, dueDate: todayStr }));
              if (projectIds.length > 0) promises.push(bulkMoveProjects.mutateAsync({ projectIds, dueDate: todayStr }));
              if (milestoneIds.length > 0) promises.push(bulkMoveMilestones.mutateAsync({ milestoneIds, dueDate: todayStr }));

              await Promise.all(promises);
            } catch {
              Alert.alert("Error", "Failed to move items. Please try again.");
            } finally {
              setMovingToToday(false);
            }
          },
        },
      ]
    );
  }, [pastDueEntities, todayStr, bulkMoveTasks, bulkMoveGoals, bulkMoveProjects, bulkMoveMilestones]);

  if (isLoading) {
    return (
      <SafeAreaView
        style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}
      >
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top", "left", "right"]}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        ListHeaderComponent={
          <>
            <View
              style={{
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: 8,
              }}
            >
              <Text style={{ fontSize: 34, fontWeight: "bold", color: "#111" }}>Today</Text>
            </View>
            <ViewButtons modeColor={modeColor} onViewPress={() => navigation.navigate("Home")} />
            <ModeFilter
              modes={modes}
              selectedMode={selectedMode}
              setSelectedMode={setSelectedMode}
            />
          </>
        }
        renderSectionHeader={({ section }) => {
          const count = section.itemCount;
          return (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 20,
                paddingTop: 18,
                paddingBottom: 10,
                backgroundColor: section.isPastDue ? "#fef2f2" : "#f0fdf4",
                borderBottomWidth: 1,
                borderBottomColor: "#e5e7eb",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text
                  style={{
                    ...textLine(16),
                    fontWeight: "700",
                    color: section.isPastDue ? "#dc2626" : "#059669",
                  }}
                >
                  {section.isPastDue ? "Past Due" : `${todayLabel} (Today)`}
                </Text>
                {count > 0 && (
                  <Text style={{ ...textLine(13), color: "#9ca3af" }}>
                    {count} {count === 1 ? "item" : "items"}
                  </Text>
                )}
              </View>
              {!section.isPastDue && (
                <TouchableOpacity
                  onPress={() => setSortByTime((p) => !p)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: sortByTime ? modeColor : "#d1d5db",
                    backgroundColor: sortByTime ? modeColor + "15" : "#fff",
                  }}
                >
                  <Feather
                    name="arrow-up"
                    size={12}
                    color={sortByTime ? modeColor : "#9ca3af"}
                  />
                  <Feather
                    name="clock"
                    size={13}
                    color={sortByTime ? modeColor : "#9ca3af"}
                  />
                </TouchableOpacity>
              )}
              {section.isPastDue && (
                <TouchableOpacity
                  onPress={() => setPastDueCollapsed((c) => !c)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={{ ...textLine(13), fontWeight: "600", color: "#1d4ed8" }}>
                    {pastDueCollapsed ? "Show" : "Hide"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        renderSectionFooter={({ section }) => {
          if (section.isPastDue) {
            if (pastDueCollapsed) return null;
            return (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  backgroundColor: "#fef2f2",
                }}
              >
                <TouchableOpacity
                  onPress={handleMoveAllToToday}
                  disabled={movingToToday}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: "#fee2e2",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                  }}
                >
                  {movingToToday ? (
                    <ActivityIndicator size="small" color="#991b1b" />
                  ) : (
                    <>
                      <Feather name="arrow-down" size={14} color="#991b1b" />
                      <Text style={{ ...textLine(13), fontWeight: "600", color: "#991b1b" }}>
                        Move all to Today
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            );
          }
          return (
            <View style={{ paddingBottom: 8 }}>
              {section.data.length === 0 && (
                <View
                  style={{
                    marginHorizontal: 12,
                    marginTop: 4,
                    borderWidth: 1,
                    borderStyle: "dashed",
                    borderColor: "#d1d5db",
                    borderRadius: 8,
                    paddingVertical: 16,
                    alignItems: "center",
                    backgroundColor: "#f9fafb",
                  }}
                >
                  <Text style={{ fontSize: 14, color: "#9ca3af", fontStyle: "italic" }}>
                    Nothing scheduled for today
                  </Text>
                </View>
              )}
              <AddTaskInlineCalendar
                dateStr={todayStr}
                modeId={activeModeId}
              />
            </View>
          );
        }}
        renderItem={({ item }) => (
          <CalendarDayItem entity={item} formStore={formStore} />
        )}
        contentContainerStyle={{ paddingBottom: selectionActive ? 140 : 80 }}
        stickySectionHeadersEnabled
      />

      {!selectionActive && (
        <FAB modeColor={modeColor} onOpenAiBuilder={() => setAiBuilderOpen(true)} />
      )}
      {selectionActive && <BatchActionBar modeColor={modeColor} />}

      <EntityFormModal
        visible={formStore.visible}
        onClose={formStore.close}
        entityType={formStore.entityType}
        editEntity={formStore.editEntity}
        defaultModeId={activeModeId}
      />

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
