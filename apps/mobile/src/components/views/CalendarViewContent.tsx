import React, { useState, useMemo, useCallback, type ReactElement } from "react";
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  RefreshControl,
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
import { useModeStore } from "@shared/store/useModeStore";
import { useGoalStore } from "@shared/store/useGoalStore";
import { useProjectStore } from "@shared/store/useProjectStore";
import { useMilestoneStore } from "@shared/store/useMilestoneStore";
import { useTaskStore } from "@shared/store/useTaskStore";
import CalendarDayItem from "../calendar/CalendarDayItem";
import EntityFormModal from "../dashboard/EntityFormModal";
import { useEntityFormStore } from "../../lib/store/useEntityFormStore";
import type { Mode } from "@shared/types/Mode";
import type { Goal } from "@shared/types/Goal";
import type { Project } from "@shared/types/Project";
import type { Milestone } from "@shared/types/Milestone";
import type { Task } from "@shared/types/Task";

type CalendarEntity = {
  id: number;
  type: "goal" | "project" | "milestone" | "task";
  title: string;
  dueDate: string;
  isCompleted: boolean;
  modeId: number;
  modeColor: string;
};

type CalendarSection = {
  title: string;
  dateKey: string;
  isToday: boolean;
  isPastDue: boolean;
  data: CalendarEntity[];
};

type Props = {
  listHeader?: ReactElement;
};

export default function CalendarViewContent({ listHeader }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);

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

  const modeColorMap = useMemo(() => {
    const m: Record<number, string> = {};
    for (const mode of modes) m[mode.id] = mode.color;
    return m;
  }, [modes]);

  const allEntities = useMemo(() => {
    const entities: CalendarEntity[] = [];
    const modeFilter =
      selectedMode === "All" ? null : (selectedMode as Mode).id;

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
        isCompleted: item.isCompleted,
        modeId: item.modeId,
        modeColor: modeColorMap[item.modeId] ?? "#6b7280",
      });
    };

    goals.forEach((g) => addEntity("goal", g));
    projects.forEach((p) => addEntity("project", p));
    milestones.forEach((m) => addEntity("milestone", m));
    tasks.forEach((t) => addEntity("task", t));

    return entities;
  }, [goals, projects, milestones, tasks, selectedMode, modeColorMap]);

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
    const s = format(weekStart, "MMM d");
    const e = format(weekEnd, "MMM d, yyyy");
    return `${s} – ${e}`;
  }, [weekStart, weekEnd]);

  const sections = useMemo(() => {
    const today = startOfDay(new Date());
    const todayStr = format(today, "yyyy-MM-dd");
    const weekStartStr = format(weekStart, "yyyy-MM-dd");
    const weekEndStr = format(weekEnd, "yyyy-MM-dd");

    const pastDue: CalendarEntity[] = [];
    const byDate: Record<string, CalendarEntity[]> = {};

    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const key = format(d, "yyyy-MM-dd");
      byDate[key] = [];
    }

    for (const entity of allEntities) {
      if (entity.isCompleted) continue;
      const dateStr = entity.dueDate;

      if (dateStr < weekStartStr) {
        if (isBefore(parseISO(dateStr), today)) {
          pastDue.push(entity);
        }
      } else if (dateStr >= weekStartStr && dateStr <= weekEndStr) {
        if (!byDate[dateStr]) byDate[dateStr] = [];
        byDate[dateStr].push(entity);
      }
    }

    const result: CalendarSection[] = [];

    if (pastDue.length > 0 && weekOffset <= 0) {
      result.push({
        title: "Past Due",
        dateKey: "past-due",
        isToday: false,
        isPastDue: true,
        data: pastDue.sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
      });
    }

    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const key = format(d, "yyyy-MM-dd");
      const dayItems = byDate[key] ?? [];
      const dayIsToday = key === todayStr;

      result.push({
        title: format(d, "EEEE, MMM d"),
        dateKey: key,
        isToday: dayIsToday,
        isPastDue: false,
        data: dayItems,
      });
    }

    return result;
  }, [allEntities, weekStart, weekEnd, weekOffset]);

  const activeModeId =
    selectedMode === "All" ? modes[0]?.id ?? 0 : (selectedMode as Mode).id;

  const onRefresh = useCallback(() => {
    // React Query handles dedup — just trigger refetches
  }, []);

  return (
    <>
      {/* Week navigator */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingVertical: 8,
        }}
      >
        <TouchableOpacity
          onPress={() => setWeekOffset((w) => w - 1)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="chevron-left" size={22} color="#374151" />
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: "500", color: "#374151" }}>
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
        </View>
        <TouchableOpacity
          onPress={() => setWeekOffset((w) => w + 1)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="chevron-right" size={22} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Calendar list */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        ListHeaderComponent={listHeader}
        renderSectionHeader={({ section }) => (
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 14,
              paddingBottom: 6,
              backgroundColor: section.isToday ? "#f0fdf4" : "#f9fafb",
              borderBottomWidth: 1,
              borderBottomColor: "#e5e7eb",
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: section.isPastDue
                  ? "#dc2626"
                  : section.isToday
                    ? "#059669"
                    : "#374151",
              }}
            >
              {section.title}
              {section.isToday && " (Today)"}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <CalendarDayItem entity={item} formStore={formStore} />
        )}
        contentContainerStyle={{ paddingBottom: 80 }}
        stickySectionHeadersEnabled
      />

      <EntityFormModal
        visible={formStore.visible}
        onClose={formStore.close}
        entityType={formStore.entityType}
        editEntity={formStore.editEntity}
        defaultModeId={activeModeId}
      />
    </>
  );
}
