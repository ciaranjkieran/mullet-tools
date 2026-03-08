import React, { useState, useMemo, useCallback, type ReactElement } from "react";
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  format,
  parseISO,
  isBefore,
  startOfDay,
} from "date-fns";
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
import CalendarDayItem from "../calendar/CalendarDayItem";
import AddTaskInlineCalendar from "../calendar/AddTaskInlineCalendar";
import EntityFormModal from "../dashboard/EntityFormModal";
import FAB from "../dashboard/FAB";
import BatchActionBar from "../batch/BatchActionBar";
import AiBuilderModal from "../ai/AiBuilderModal";
import { textLine } from "../../lib/styles/platform";
import { useEntityFormStore } from "../../lib/store/useEntityFormStore";
import { useSelectionStore } from "../../lib/store/useSelectionStore";
import type { Mode } from "@shared/types/Mode";
import type { Goal } from "@shared/types/Goal";
import type { Project } from "@shared/types/Project";
import type { Milestone } from "@shared/types/Milestone";
import type { Task } from "@shared/types/Task";

export type CalendarEntity = {
  id: number;
  type: "goal" | "project" | "milestone" | "task";
  title: string;
  dueDate: string;
  dueTime?: string | null;
  isCompleted: boolean;
  modeId: number;
  modeColor: string;
  modeTitle?: string;
  parentTitle?: string;
};

type CalendarSection = {
  title: string;
  dateKey: string;
  isToday: boolean;
  isPastDue: boolean;
  itemCount: number;
  data: CalendarEntity[];
};

type Props = {
  listHeader?: ReactElement;
};

export default function CalendarViewContent({ listHeader }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [pastDueCollapsed, setPastDueCollapsed] = useState(false);
  const [movingToToday, setMovingToToday] = useState(false);
  const [isTodayFocus, setIsTodayFocus] = useState(false);
  const [timeSortKeys, setTimeSortKeys] = useState<Record<string, boolean>>({});

  const selectionActive = useSelectionStore((s) => s.isActive);

  const bulkMoveTasks = useBulkMoveTasks();
  const bulkMoveGoals = useBulkMoveGoals();
  const bulkMoveProjects = useBulkMoveProjects();
  const bulkMoveMilestones = useBulkMoveMilestones();

  // Data hooks (safe to call even if parent already calls them — React Query deduplicates)
  useModes();
  useGoals();
  useProjects();
  useMilestones();
  useTasks();

  const modes = useModeStore((s) => s.modes);
  const selectedMode = useModeStore((s) => s.selectedMode);
  const goals = useGoalStore((s) => s.goals);
  const projects = useProjectStore((s) => s.projects);
  const milestones = useMilestoneStore((s) => s.milestones);
  const tasks = useTaskStore((s) => s.tasks);
  const formStore = useEntityFormStore();
  const [aiBuilderOpen, setAiBuilderOpen] = useState(false);

  const firstMode = modes[0];
  const modeColor =
    selectedMode === "All" ? (firstMode?.color ?? "#000") : (selectedMode as Mode).color;

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

  const TYPE_RANK: Record<string, number> = { task: 0, milestone: 1, project: 2, goal: 3 };

  const sortEntities = useCallback(
    (items: CalendarEntity[], byTime: boolean) => {
      return [...items].sort((a, b) => {
        if (byTime) {
          const aHasTime = !!a.dueTime;
          const bHasTime = !!b.dueTime;
          if (aHasTime !== bHasTime) return aHasTime ? -1 : 1;
          if (aHasTime && bHasTime) {
            const cmp = a.dueTime!.localeCompare(b.dueTime!);
            if (cmp !== 0) return cmp;
          }
        }
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

  const baseDate = useMemo(() => addWeeks(new Date(), weekOffset), [weekOffset]);
  const weekStart = useMemo(
    () => startOfWeek(baseDate, { weekStartsOn: 1 }),
    [baseDate]
  );
  const weekEnd = useMemo(
    () => endOfWeek(baseDate, { weekStartsOn: 1 }),
    [baseDate]
  );

  const weekLabel = useMemo(() => {
    const isCurrentWeek = weekOffset === 0;
    const displayStart = isCurrentWeek ? new Date() : weekStart;
    const s = format(displayStart, "MMM d");
    const e = format(weekEnd, "MMM d, yyyy");
    const range = `${s} – ${e}`;
    return isCurrentWeek ? `This week, ${range}` : range;
  }, [weekStart, weekEnd, weekOffset]);

  const { sections, pastDueEntities } = useMemo(() => {
    const today = startOfDay(new Date());
    const todayStr = format(today, "yyyy-MM-dd");
    const weekStartStr = format(weekStart, "yyyy-MM-dd");
    const weekEndStr = format(weekEnd, "yyyy-MM-dd");
    const isCurrentWeek = weekOffset === 0;

    const pastDue: CalendarEntity[] = [];
    const byDate: Record<string, CalendarEntity[]> = {};

    // Build date buckets
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const key = format(d, "yyyy-MM-dd");
      // Today focus: only show today
      if (isTodayFocus) {
        if (key === todayStr) byDate[key] = [];
        continue;
      }
      // Current week: skip past days
      if (isCurrentWeek && key < todayStr) continue;
      byDate[key] = [];
    }

    for (const entity of allEntities) {
      if (entity.isCompleted) continue;
      const dateStr = entity.dueDate;

      if (isBefore(parseISO(dateStr), today)) {
        pastDue.push(entity);
      } else if (dateStr >= weekStartStr && dateStr <= weekEndStr) {
        if (byDate[dateStr]) {
          byDate[dateStr].push(entity);
        }
      }
    }

    const sorted = pastDue.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const result: CalendarSection[] = [];

    // Hide past due when in today focus
    if (sorted.length > 0 && isCurrentWeek && !isTodayFocus) {
      result.push({
        title: "Past Due",
        dateKey: "past-due",
        isToday: false,
        isPastDue: true,
        itemCount: sorted.length,
        data: pastDueCollapsed ? [] : sorted,
      });
    }

    const dateKeys = Object.keys(byDate).sort();
    for (const key of dateKeys) {
      const dayItems = byDate[key];
      const dayIsToday = key === todayStr;
      const isByTime = !!timeSortKeys[key];

      result.push({
        title: format(parseISO(key), "EEEE, MMM d"),
        dateKey: key,
        isToday: dayIsToday,
        isPastDue: false,
        itemCount: dayItems.length,
        data: sortEntities(dayItems, isByTime),
      });
    }

    return { sections: result, pastDueEntities: sorted };
  }, [allEntities, weekStart, weekEnd, weekOffset, pastDueCollapsed, isTodayFocus, timeSortKeys, sortEntities]);

  const activeModeId =
    selectedMode === "All" ? (firstMode?.id ?? 0) : (selectedMode as Mode).id;
  const activeModeTitle =
    selectedMode === "All" ? (firstMode?.title ?? "") : (selectedMode as Mode).title;

  const handleMoveAllToToday = useCallback(() => {
    if (pastDueEntities.length === 0) return;
    const todayStr = format(new Date(), "yyyy-MM-dd");

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
  }, [pastDueEntities, bulkMoveTasks, bulkMoveGoals, bulkMoveProjects, bulkMoveMilestones]);

  const onRefresh = useCallback(() => {
    // React Query handles dedup — just trigger refetches
  }, []);

  const weekNav = isTodayFocus ? null : (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
        gap: 12,
      }}
    >
      <Text style={{ ...textLine(16), fontWeight: "600", color: "#374151" }}>
        {weekLabel}
      </Text>
      {weekOffset !== 0 && (
        <TouchableOpacity onPress={() => setWeekOffset(0)}>
          <Text
            style={{ color: "#2563eb", fontWeight: "600", fontSize: 13 }}
          >
            Today
          </Text>
        </TouchableOpacity>
      )}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        {weekOffset > 0 && (
          <TouchableOpacity
            onPress={() => setWeekOffset((w) => w - 1)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="chevron-left" size={22} color="#374151" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => setWeekOffset((w) => w + 1)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="chevron-right" size={22} color="#374151" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <>
      {/* Calendar list */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        ListHeaderComponent={<>{listHeader}{weekNav}</>}
        renderSectionHeader={({ section }) => {
          const count = section.itemCount;
          return (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 20,
                paddingVertical: 14,
                backgroundColor: section.isPastDue
                  ? "#fef2f2"
                  : section.isToday
                    ? modeColor + "15"
                    : "#fff",
                borderBottomWidth: 1,
                borderBottomColor: "#e5e7eb",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text
                  style={{
                    ...textLine(16),
                    fontWeight: "700",
                    color: section.isPastDue
                      ? "#dc2626"
                      : "#1f2937",
                  }}
                >
                  {section.title}
                </Text>
                {section.isToday && (
                  <Text style={{ ...textLine(14), fontWeight: "700", color: "#059669" }}>
                    Today
                  </Text>
                )}
                {count > 0 && (
                  <Text style={{ ...textLine(13), color: "#9ca3af" }}>
                    {count} {count === 1 ? "item" : "items"}
                  </Text>
                )}
              </View>
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
              {!section.isPastDue && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <TouchableOpacity
                    onPress={() =>
                      setTimeSortKeys((prev) => ({
                        ...prev,
                        [section.dateKey]: !prev[section.dateKey],
                      }))
                    }
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 3,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: timeSortKeys[section.dateKey] ? "#93c5fd" : "#d1d5db",
                      backgroundColor: timeSortKeys[section.dateKey] ? "#dbeafe" : "transparent",
                    }}
                  >
                    <Feather
                      name="arrow-up"
                      size={12}
                      color={timeSortKeys[section.dateKey] ? "#2563eb" : "#9ca3af"}
                    />
                    <Feather
                      name="clock"
                      size={12}
                      color={timeSortKeys[section.dateKey] ? "#2563eb" : "#9ca3af"}
                    />
                  </TouchableOpacity>
                  {section.isToday && (
                    <TouchableOpacity
                      onPress={() => {
                        setIsTodayFocus((f) => !f);
                        if (!isTodayFocus) setWeekOffset(0);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{
                        padding: 4,
                        borderRadius: 6,
                        backgroundColor: isTodayFocus ? "#dcfce7" : "transparent",
                      }}
                    >
                      {isTodayFocus ? (
                        <Feather name="x" size={18} color="#059669" />
                      ) : (
                        <Feather name="crosshair" size={18} color="#059669" />
                      )}
                    </TouchableOpacity>
                  )}
                </View>
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
                    Nothing scheduled
                  </Text>
                </View>
              )}
              <AddTaskInlineCalendar
                dateStr={section.dateKey}
                modeId={activeModeId}
              />
            </View>
          );
        }}
        renderItem={({ item }) => (
          <CalendarDayItem entity={item} formStore={formStore} />
        )}
        contentContainerStyle={{ paddingBottom: selectionActive ? 140 : 80 }}
        stickySectionHeadersEnabled={false}
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
    </>
  );
}
