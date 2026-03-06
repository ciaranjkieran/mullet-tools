import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import EntityIcon from "../EntityIcon";
import { useGoalStore } from "@shared/store/useGoalStore";
import { useProjectStore } from "@shared/store/useProjectStore";
import { useMilestoneStore } from "@shared/store/useMilestoneStore";
import { useTaskStore } from "@shared/store/useTaskStore";
import { useModeStore } from "@shared/store/useModeStore";
import { textLine } from "../../lib/styles/platform";
import type { EntityFormType } from "../../lib/store/useEntityFormStore";

type Props = {
  entityType: "goal" | "project" | "milestone";
  entityId: number;
  entityTitle?: string;
  modeId: number;
  onNavigate: (type: EntityFormType, entityId: number) => void;
};

type TreeRow = {
  key: string;
  id: number;
  type: EntityFormType;
  title: string;
  depth: number;
  isCompleted: boolean;
  childCount: number;
};


export default function StructureTab({ entityType, entityId, entityTitle, modeId, onNavigate }: Props) {
  const projects = useProjectStore((s) => s.projects);
  const milestones = useMilestoneStore((s) => s.milestones);
  const tasks = useTaskStore((s) => s.tasks);
  const modes = useModeStore((s) => s.modes);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleCollapse = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const modeColor = modes.find((m) => m.id === modeId)?.color ?? "#6b7280";

  const rows = useMemo(() => {
    const result: TreeRow[] = [];

    const pushTasks = (filter: (t: typeof tasks[0]) => boolean, depth: number) => {
      for (const t of tasks.filter(filter)) {
        result.push({
          key: `task-${t.id}`,
          id: t.id,
          type: "task",
          title: t.title,
          depth,
          isCompleted: t.isCompleted,
          childCount: 0,
        });
      }
    };

    const pushMilestone = (ms: typeof milestones[0], depth: number) => {
      const msTasks = tasks.filter((t) => t.milestoneId === ms.id);
      const childMs = milestones.filter((m) => m.parentId === ms.id);
      result.push({
        key: `milestone-${ms.id}`,
        id: ms.id,
        type: "milestone",
        title: ms.title,
        depth,
        isCompleted: ms.isCompleted,
        childCount: msTasks.length + childMs.length,
      });
      if (!collapsed.has(`milestone-${ms.id}`)) {
        for (const child of childMs) pushMilestone(child, depth + 1);
        pushTasks((t) => t.milestoneId === ms.id, depth + 1);
      }
    };

    const pushProject = (proj: typeof projects[0], depth: number) => {
      const subProjects = projects.filter((p) => p.parentId === proj.id);
      const projMs = milestones.filter((m) => m.projectId === proj.id && !m.parentId);
      const projTasks = tasks.filter((t) => t.projectId === proj.id && !t.milestoneId);
      result.push({
        key: `project-${proj.id}`,
        id: proj.id,
        type: "project",
        title: proj.title,
        depth,
        isCompleted: proj.isCompleted,
        childCount: subProjects.length + projMs.length + projTasks.length,
      });
      if (!collapsed.has(`project-${proj.id}`)) {
        for (const sub of subProjects) pushProject(sub, depth + 1);
        for (const ms of projMs) pushMilestone(ms, depth + 1);
        pushTasks((t) => t.projectId === proj.id && !t.milestoneId, depth + 1);
      }
    };

    if (entityType === "goal") {
      // Projects under goal
      for (const proj of projects.filter((p) => p.goalId === entityId && !p.parentId)) {
        pushProject(proj, 0);
      }
      // Direct milestones under goal (no project)
      for (const ms of milestones.filter((m) => m.goalId === entityId && !m.projectId && !m.parentId)) {
        pushMilestone(ms, 0);
      }
      // Direct tasks under goal
      pushTasks((t) => t.goalId === entityId && !t.projectId && !t.milestoneId, 0);
    }

    if (entityType === "project") {
      // Sub-projects
      for (const proj of projects.filter((p) => p.parentId === entityId)) {
        pushProject(proj, 0);
      }
      // Milestones under project
      for (const ms of milestones.filter((m) => m.projectId === entityId && !m.parentId)) {
        pushMilestone(ms, 0);
      }
      // Direct tasks
      pushTasks((t) => t.projectId === entityId && !t.milestoneId, 0);
    }

    if (entityType === "milestone") {
      // Child milestones
      for (const ms of milestones.filter((m) => m.parentId === entityId)) {
        pushMilestone(ms, 0);
      }
      // Direct tasks
      pushTasks((t) => t.milestoneId === entityId, 0);
    }

    return result;
  }, [entityType, entityId, projects, milestones, tasks, collapsed]);

  if (rows.length === 0) {
    return (
      <View style={{ flex: 1, paddingVertical: 12 }}>
        {entityTitle && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingHorizontal: 24,
              paddingBottom: 16,
            }}
          >
            <EntityIcon type={entityType} size={20} color={modeColor} />
            <Text style={{ ...textLine(16), fontWeight: "700", color: "#111", flex: 1 }} numberOfLines={1}>
              {entityTitle}
            </Text>
          </View>
        )}
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 28 }}>
          <View
            style={{
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: "#d1d5db",
              borderRadius: 8,
              paddingVertical: 24,
              paddingHorizontal: 32,
              alignItems: "center",
            }}
          >
            <Feather name="git-branch" size={24} color="#9ca3af" />
            <Text style={{ ...textLine(14), color: "#9ca3af", fontStyle: "italic", marginTop: 8 }}>
              No child entities
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const header = entityTitle ? (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 8,
      }}
    >
      <EntityIcon type={entityType} size={20} color={modeColor} />
      <Text style={{ ...textLine(16), fontWeight: "700", color: "#111", flex: 1 }} numberOfLines={1}>
        {entityTitle}
      </Text>
    </View>
  ) : null;

  return (
    <FlatList
      data={rows}
      keyExtractor={(item) => item.key}
      ListHeaderComponent={header}
      contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
      renderItem={({ item }) => (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 10,
            paddingHorizontal: 12,
            paddingLeft: 12 + item.depth * 20,
            marginVertical: 2,
            borderRadius: 8,
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: "#f3f4f6",
            borderLeftWidth: 3,
            borderLeftColor: modeColor,
          }}
        >
          <TouchableOpacity
            onPress={() => item.childCount > 0 && toggleCollapse(item.key)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 4 }}
            style={{ padding: 6 }}
            activeOpacity={item.childCount > 0 ? 0.6 : 1}
          >
            <EntityIcon
              type={item.type}
              size={22}
              color={item.isCompleted ? "#9ca3af" : modeColor}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onNavigate(item.type, item.id)}
            activeOpacity={0.7}
            style={{ flex: 1, marginLeft: 10 }}
          >
            <Text
              style={{
                ...textLine(item.type === "task" ? 14 : 15),
                fontWeight: item.type === "task" ? "400" : "500",
                color: item.isCompleted ? "#9ca3af" : "#111",
                textDecorationLine: item.isCompleted ? "line-through" : "none",
              }}
            >
              {item.title}
            </Text>
          </TouchableOpacity>

          {item.childCount > 0 && (
            <TouchableOpacity
              onPress={() => toggleCollapse(item.key)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ marginLeft: 8, padding: 4 }}
            >
              <Feather
                name={collapsed.has(item.key) ? "chevron-right" : "chevron-down"}
                size={14}
                color="#9ca3af"
              />
            </TouchableOpacity>
          )}
        </View>
      )}
    />
  );
}
