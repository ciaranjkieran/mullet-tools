import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { format, startOfDay } from "date-fns";
import { useModes } from "@shared/api/hooks/modes/useModes";
import { useGoals } from "@shared/api/hooks/goals/useGoals";
import { useProjects } from "@shared/api/hooks/projects/useProjects";
import { useMilestones } from "@shared/api/hooks/milestones/useMilestones";
import { useTasks } from "@shared/api/hooks/tasks/useTasks";
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
  const selectionActive = useSelectionStore((s) => s.isActive);

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

  const todayItems = useMemo(() => {
    const todayList: CalendarEntity[] = [];

    for (const entity of allEntities) {
      if (entity.isCompleted) continue;
      if (entity.dueDate === todayStr) {
        todayList.push(entity);
      }
    }

    // Sort today items: apply saved order if available, fallback to default
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

      return [...ordered, ...defaultSort(unordered)];
    }

    return defaultSort(todayList);
  }, [allEntities, todayStr, savedOrder, defaultSort]);

  const activeModeId =
    selectedMode === "All" ? (firstMode?.id ?? 0) : (selectedMode as Mode).id;
  const activeModeTitle =
    selectedMode === "All" ? (firstMode?.title ?? "") : (selectedMode as Mode).title;

  const handleDragEnd = useCallback(
    ({ data }: { data: CalendarEntity[] }) => {
      // When filtering by mode, merge reordered items with existing order
      // for items not currently visible, so we don't overwrite other modes
      const reordered = data.map((item, idx) => ({
        entity_type: item.type as "goal" | "project" | "milestone" | "task",
        entity_id: item.id,
        position: idx,
      }));

      const reorderedKeys = new Set(
        reordered.map((r) => `${r.entity_type}-${r.entity_id}`)
      );

      // Keep existing positions for items not in the current view
      const preserved = (savedOrder ?? [])
        .filter((o) => !reorderedKeys.has(`${o.entity_type}-${o.entity_id}`))
        .map((o, i) => ({ ...o, position: reordered.length + i }));

      setDailyOrder.mutate({
        dateStr: todayStr,
        items: [...reordered, ...preserved],
      });
    },
    [todayStr, setDailyOrder, savedOrder]
  );

  const renderDraggableItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<CalendarEntity>) => (
      <ScaleDecorator>
        <CalendarDayItem entity={item} formStore={formStore} drag={drag} />
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
                <Feather name="menu" size={14} color="#9ca3af" />
                <Text style={{ ...textLine(12), color: "#9ca3af" }}>
                  Drag to reorder
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
