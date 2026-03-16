import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
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
import { useDailyOrder } from "@shared/api/hooks/dailyOrder/useDailyOrder";
import { useSetDailyOrder } from "@shared/api/hooks/dailyOrder/useSetDailyOrder";
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

export default function TodayScreen() {
  const navigation = useNavigation<any>();
  const [pastDueCollapsed, setPastDueCollapsed] = useState(false);
  const [movingToToday, setMovingToToday] = useState(false);
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
    selectedMode === "All" ? "#000" : (selectedMode as Mode).color;

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

  const today = useMemo(() => startOfDay(new Date()), []);
  const todayStr = useMemo(() => format(today, "yyyy-MM-dd"), [today]);
  const todayLabel = useMemo(() => format(today, "EEEE, MMM d"), [today]);

  // Fetch saved daily order
  const { data: savedOrder } = useDailyOrder(todayStr);
  const setDailyOrder = useSetDailyOrder();

  const TYPE_RANK: Record<string, number> = { task: 0, milestone: 1, project: 2, goal: 3 };

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

  // Default sort: mode position → timed first → entity type → title
  const defaultSort = useCallback(
    (items: CalendarEntity[]) => {
      return [...items].sort((a, b) => {
        const modeA = modePositionMap[a.modeId] ?? 999;
        const modeB = modePositionMap[b.modeId] ?? 999;
        if (modeA !== modeB) return modeA - modeB;
        const aHasTime = !!a.dueTime;
        const bHasTime = !!b.dueTime;
        if (aHasTime !== bHasTime) return aHasTime ? -1 : 1;
        if (aHasTime && bHasTime) {
          const cmp = a.dueTime!.localeCompare(b.dueTime!);
          if (cmp !== 0) return cmp;
        }
        const typeA = TYPE_RANK[a.type] ?? 9;
        const typeB = TYPE_RANK[b.type] ?? 9;
        if (typeA !== typeB) return typeA - typeB;
        return a.title.localeCompare(b.title);
      });
    },
    [modePositionMap]
  );

  const { pastDueItems, todayItems } = useMemo(() => {
    const pastDue: CalendarEntity[] = [];
    const todayList: CalendarEntity[] = [];

    for (const entity of allEntities) {
      if (entity.isCompleted) continue;
      if (isBefore(parseISO(entity.dueDate), today)) {
        pastDue.push(entity);
      } else if (entity.dueDate === todayStr) {
        todayList.push(entity);
      }
    }

    // Sort today items: apply saved order if available, fallback to default
    let sortedToday: CalendarEntity[];
    if (savedOrder && savedOrder.length > 0) {
      const orderMap = new Map<string, number>();
      for (const o of savedOrder) {
        orderMap.set(`${o.entity_type}-${o.entity_id}`, o.position);
      }

      const ordered: CalendarEntity[] = [];
      const unordered: CalendarEntity[] = [];
      for (const item of todayList) {
        const key = `${item.type}-${item.id}`;
        if (orderMap.has(key)) {
          ordered.push(item);
        } else {
          unordered.push(item);
        }
      }

      ordered.sort((a, b) => {
        const posA = orderMap.get(`${a.type}-${a.id}`) ?? 999;
        const posB = orderMap.get(`${b.type}-${b.id}`) ?? 999;
        return posA - posB;
      });

      // New items go at the end, sorted by default
      sortedToday = [...ordered, ...defaultSort(unordered)];
    } else {
      sortedToday = defaultSort(todayList);
    }

    return {
      pastDueItems: defaultSort(pastDue),
      todayItems: sortedToday,
    };
  }, [allEntities, today, todayStr, savedOrder, defaultSort]);

  const activeModeId =
    selectedMode === "All" ? (firstMode?.id ?? 0) : (selectedMode as Mode).id;
  const activeModeTitle =
    selectedMode === "All" ? (firstMode?.title ?? "") : (selectedMode as Mode).title;

  const handleMoveAllToToday = useCallback(() => {
    if (pastDueItems.length === 0) return;

    Alert.alert(
      "Move All to Today",
      `Reschedule ${pastDueItems.length} past due item${pastDueItems.length > 1 ? "s" : ""} to today?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Move",
          onPress: async () => {
            setMovingToToday(true);
            try {
              const taskIds = pastDueItems.filter((e) => e.type === "task").map((e) => e.id);
              const goalIds = pastDueItems.filter((e) => e.type === "goal").map((e) => e.id);
              const projectIds = pastDueItems.filter((e) => e.type === "project").map((e) => e.id);
              const milestoneIds = pastDueItems.filter((e) => e.type === "milestone").map((e) => e.id);

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
  }, [pastDueItems, todayStr, bulkMoveTasks, bulkMoveGoals, bulkMoveProjects, bulkMoveMilestones]);

  const handleDragEnd = useCallback(
    ({ data }: { data: CalendarEntity[] }) => {
      setDailyOrder.mutate({
        dateStr: todayStr,
        items: data.map((item, idx) => ({
          entity_type: item.type,
          entity_id: item.id,
          position: idx,
        })),
      });
    },
    [todayStr, setDailyOrder]
  );

  const renderDraggableItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<CalendarEntity>) => (
      <ScaleDecorator>
        <TouchableOpacity
          onLongPress={drag}
          disabled={isActive}
          activeOpacity={1}
        >
          <CalendarDayItem entity={item} formStore={formStore} />
        </TouchableOpacity>
      </ScaleDecorator>
    ),
    [formStore]
  );

  if (isLoading) {
    return (
      <SafeAreaView
        style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}
      >
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  const pastDueSection = pastDueItems.length > 0 ? (
    <View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingVertical: 14,
          backgroundColor: "#fef2f2",
          borderBottomWidth: 1,
          borderBottomColor: "#e5e7eb",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ ...textLine(16), fontWeight: "700", color: "#dc2626" }}>
            Past Due
          </Text>
          <Text style={{ ...textLine(13), color: "#9ca3af" }}>
            {pastDueItems.length} {pastDueItems.length === 1 ? "item" : "items"}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setPastDueCollapsed((c) => !c)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ ...textLine(13), fontWeight: "600", color: "#1d4ed8" }}>
            {pastDueCollapsed ? "Show" : "Hide"}
          </Text>
        </TouchableOpacity>
      </View>

      {!pastDueCollapsed && (
        <>
          {pastDueItems.map((item) => (
            <CalendarDayItem
              key={`${item.type}-${item.id}`}
              entity={item}
              formStore={formStore}
            />
          ))}
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
        </>
      )}
    </View>
  ) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top", "left", "right"]}>
      <DraggableFlatList
        data={todayItems}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        renderItem={renderDraggableItem}
        onDragEnd={handleDragEnd}
        activationDistance={15}
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
            <ViewButtons modeColor={modeColor} onViewPress={() => navigation.navigate("Home")} onOpenAiBuilder={selectedMode !== "All" ? () => setAiBuilderOpen(true) : undefined} />
            <ModeFilter
              modes={modes}
              selectedMode={selectedMode}
              setSelectedMode={setSelectedMode}
            />

            {pastDueSection}

            {/* Today section header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 20,
                paddingVertical: 14,
                backgroundColor: modeColor + "15",
                borderBottomWidth: 1,
                borderBottomColor: "#e5e7eb",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ ...textLine(16), fontWeight: "700", color: "#1f2937" }}>
                  {todayLabel}
                </Text>
                <Text style={{ ...textLine(14), fontWeight: "700", color: "#059669" }}>
                  Today
                </Text>
                {todayItems.length > 0 && (
                  <Text style={{ ...textLine(13), color: "#9ca3af" }}>
                    {todayItems.length} {todayItems.length === 1 ? "item" : "items"}
                  </Text>
                )}
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Feather name="menu" size={16} color="#9ca3af" />
                <Text style={{ ...textLine(12), color: "#9ca3af" }}>
                  Hold to reorder
                </Text>
              </View>
            </View>
          </>
        }
        ListFooterComponent={
          <View style={{ paddingBottom: 8 }}>
            {todayItems.length === 0 && (
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
        }
        contentContainerStyle={{ paddingBottom: selectionActive ? 140 : 80 }}
      />

      {!selectionActive && (
        <FAB modeColor={modeColor} defaultDate={format(new Date(), "yyyy-MM-dd")} />
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
