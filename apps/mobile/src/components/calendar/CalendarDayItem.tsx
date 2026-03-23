import React, { useState, useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import EntityIcon from "../EntityIcon";
import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import { useUpdateGoal } from "@shared/api/hooks/goals/useUpdateGoal";
import { useUpdateProject } from "@shared/api/hooks/projects/useUpdateProject";
import { useUpdateMilestone } from "@shared/api/hooks/milestones/useUpdateMilestone";
import { useDeleteTask } from "@shared/api/hooks/tasks/useDeleteTask";
import { useGoalStore } from "@shared/store/useGoalStore";
import { useProjectStore } from "@shared/store/useProjectStore";
import { useMilestoneStore } from "@shared/store/useMilestoneStore";
import { useTaskStore } from "@shared/store/useTaskStore";
import { useSelectionStore } from "../../lib/store/useSelectionStore";
import { cardShadow, selectedShadow, textLine } from "../../lib/styles/platform";
import type { CalendarEntity } from "../views/CalendarViewContent";
import type { EntityFormType } from "../../lib/store/useEntityFormStore";

type Props = {
  entity: CalendarEntity;
  formStore: {
    openEdit: (type: EntityFormType, entity: any) => void;
  };
  drag?: () => void;
};

export default function CalendarDayItem({ entity, formStore, drag }: Props) {
  const qc = useQueryClient();
  const updateGoal = useUpdateGoal();
  const updateProject = useUpdateProject();
  const updateMilestone = useUpdateMilestone();
  const deleteTask = useDeleteTask();

  const goals = useGoalStore((s) => s.goals);
  const projects = useProjectStore((s) => s.projects);
  const milestones = useMilestoneStore((s) => s.milestones);
  const tasks = useTaskStore((s) => s.tasks);

  const selectionActive = useSelectionStore((s) => s.isActive);
  const isSelected = useSelectionStore((s) => s.isSelected(entity.type, entity.id));
  const toggleSelection = useSelectionStore((s) => s.toggle);

  const [checked, setChecked] = useState(false);
  const [opacity] = useState(() => new Animated.Value(1));

  const invalidateTimer = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["activeTimer"], exact: false });
    qc.invalidateQueries({ queryKey: ["timer"], exact: false });
    qc.invalidateQueries({ queryKey: ["time-entries"], exact: false });
    qc.invalidateQueries({ queryKey: ["timeEntries"], exact: false });
  }, [qc]);

  const handleCheck = useCallback(() => {
    if (checked) return;
    setChecked(true);

    if (entity.type === "task") {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 400,
        delay: 200,
        useNativeDriver: true,
      }).start(() => {
        deleteTask.mutate(entity.id, { onSuccess: invalidateTimer });
      });
    } else {
      const payload = { id: entity.id, isCompleted: true };
      Animated.timing(opacity, {
        toValue: 0,
        duration: 400,
        delay: 200,
        useNativeDriver: true,
      }).start(() => {
        switch (entity.type) {
          case "goal":
            updateGoal.mutate(payload, { onSuccess: invalidateTimer });
            break;
          case "project":
            updateProject.mutate(payload, { onSuccess: invalidateTimer });
            break;
          case "milestone":
            updateMilestone.mutate(payload, { onSuccess: invalidateTimer });
            break;
        }
      });
    }
  }, [checked, entity, opacity, deleteTask, updateGoal, updateProject, updateMilestone, invalidateTimer]);

  const handleTap = () => {
    if (checked) return;
    if (selectionActive) {
      toggleSelection(entity.type, entity.id);
      return;
    }
    let fullEntity;
    switch (entity.type) {
      case "goal":
        fullEntity = goals.find((g) => g.id === entity.id);
        break;
      case "project":
        fullEntity = projects.find((p) => p.id === entity.id);
        break;
      case "milestone":
        fullEntity = milestones.find((m) => m.id === entity.id);
        break;
      case "task":
        fullEntity = tasks.find((t) => t.id === entity.id);
        break;
    }
    if (fullEntity) {
      formStore.openEdit(entity.type, fullEntity);
    }
  };

  const handleLongPress = () => {
    toggleSelection(entity.type, entity.id);
  };

  const timeLabel = entity.dueTime ? entity.dueTime.slice(0, 5) : null;

  const overdueLabel = useMemo(() => {
    const today = startOfDay(new Date());
    const due = parseISO(entity.dueDate);
    if (due < today) {
      const days = differenceInCalendarDays(today, due);
      return `${days} day${days > 1 ? "s" : ""} ago`;
    }
    return null;
  }, [entity.dueDate]);

  return (
    <Animated.View style={{ opacity }}>
      <TouchableOpacity
        onPress={handleTap}
        onLongPress={handleLongPress}
        activeOpacity={0.7}
        style={{
          marginHorizontal: 12,
          marginVertical: 4,
          borderWidth: isSelected ? 2 : 1,
          borderColor: isSelected ? entity.modeColor : "#e5e7eb",
          borderRadius: 8,
          borderLeftWidth: isSelected ? 2 : 3,
          borderLeftColor: entity.modeColor,
          backgroundColor: isSelected ? "#f0f8ff" : "#fff",
          overflow: "hidden",
          flexDirection: "row",
          alignItems: "center",
          padding: 12,
          ...(isSelected ? selectedShadow(entity.modeColor) : cardShadow("sm")),
        }}
      >
        {/* Left: entity icon */}
        <EntityIcon type={entity.type} color={entity.modeColor} />

        {/* Center: title + meta */}
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text
            style={{
              ...textLine(15),
              fontWeight: "600",
              color: "#111",
            }}
            numberOfLines={2}
          >
            {entity.title}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2, gap: 6 }}>
            {timeLabel && (
              <Text style={{ ...textLine(12), color: "#6b7280" }}>{timeLabel}</Text>
            )}
            {overdueLabel && (
              <>
                {timeLabel && <Text style={{ ...textLine(12), color: "#d1d5db" }}>·</Text>}
                <Text style={{ ...textLine(12), color: "#dc2626", fontWeight: "600" }}>
                  {overdueLabel}
                </Text>
              </>
            )}
          </View>
          {entity.parentTitle ? (
            <Text
              style={{ ...textLine(12), color: "#374151", fontWeight: "500", marginTop: 2 }}
              numberOfLines={1}
            >
              {entity.parentTitle}
            </Text>
          ) : null}
          {entity.modeTitle ? (
            <Text
              style={{ ...textLine(12), fontWeight: "500", marginTop: 1, color: entity.modeColor }}
              numberOfLines={1}
            >
              {entity.modeTitle}
            </Text>
          ) : null}
        </View>

        {/* Drag handle */}
        {drag && (
          <TouchableOpacity
            onPressIn={drag}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ marginLeft: 8, padding: 4 }}
          >
            <Feather name="menu" size={16} color="#d1d5db" />
          </TouchableOpacity>
        )}

        {/* Right: checkbox */}
        <TouchableOpacity
          onPress={handleCheck}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ marginLeft: 8 }}
        >
          {checked ? (
            <Feather name="check-square" size={20} color={entity.modeColor} />
          ) : (
            <View
              style={{
                width: 20,
                height: 20,
                borderWidth: 1.5,
                borderColor: "#d1d5db",
                borderRadius: 4,
              }}
            />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}
