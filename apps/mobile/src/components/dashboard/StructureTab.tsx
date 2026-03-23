import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import EntityIcon from "../EntityIcon";
import { useGoalStore } from "@shared/store/useGoalStore";
import { useProjectStore } from "@shared/store/useProjectStore";
import { useMilestoneStore } from "@shared/store/useMilestoneStore";
import { useTaskStore } from "@shared/store/useTaskStore";
import { useModeStore } from "@shared/store/useModeStore";
import { useUpdateGoal } from "@shared/api/hooks/goals/useUpdateGoal";
import { useUpdateProject } from "@shared/api/hooks/projects/useUpdateProject";
import { useUpdateMilestone } from "@shared/api/hooks/milestones/useUpdateMilestone";
import { useUpdateTask } from "@shared/api/hooks/tasks/useUpdateTask";
import { useCreateTask } from "@shared/api/hooks/tasks/useCreateTask";
import { getContrastingText } from "@shared/utils/getContrastingText";
import { textLine } from "../../lib/styles/platform";
import type { EntityFormType } from "../../lib/store/useEntityFormStore";

type Props = {
  entityType: "goal" | "project" | "milestone";
  entityId: number;
  entityTitle?: string;
  modeId: number;
  onNavigate: (type: EntityFormType, entityId: number) => void;
};

type EntityRow = {
  kind: "entity";
  key: string;
  id: number;
  type: EntityFormType;
  title: string;
  depth: number;
  isCompleted: boolean;
  childCount: number;
};

type AddTaskRow = {
  kind: "add-task";
  key: string;
  depth: number;
  goalId: number | null;
  projectId: number | null;
  milestoneId: number | null;
};

type TreeRow = EntityRow | AddTaskRow;

export default function StructureTab({ entityType, entityId, entityTitle, modeId, onNavigate }: Props) {
  const insets = useSafeAreaInsets();
  const projects = useProjectStore((s) => s.projects);
  const milestones = useMilestoneStore((s) => s.milestones);
  const tasks = useTaskStore((s) => s.tasks);
  const modes = useModeStore((s) => s.modes);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [expandedAddTask, setExpandedAddTask] = useState<string | null>(null);
  const [addTaskTitle, setAddTaskTitle] = useState("");

  const toggleCollapse = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const modeColor = modes.find((m) => m.id === modeId)?.color ?? "#6b7280";
  const saveTextColor = getContrastingText(modeColor);

  const updateGoal = useUpdateGoal();
  const updateProject = useUpdateProject();
  const updateMilestone = useUpdateMilestone();
  const updateTask = useUpdateTask();
  const createTask = useCreateTask();

  const toggleCompleted = useCallback((row: EntityRow) => {
    const next = !row.isCompleted;
    switch (row.type) {
      case "goal":
        updateGoal.mutate({ id: row.id, isCompleted: next } as any);
        break;
      case "project":
        updateProject.mutate({ id: row.id, isCompleted: next } as any);
        break;
      case "milestone":
        updateMilestone.mutate({ id: row.id, isCompleted: next } as any);
        break;
      case "task":
        updateTask.mutate({ id: row.id, isCompleted: next });
        break;
    }
  }, [updateGoal, updateProject, updateMilestone, updateTask]);

  const handleAddTask = useCallback((row: AddTaskRow) => {
    if (!addTaskTitle.trim()) return;
    createTask.mutate(
      {
        title: addTaskTitle.trim(),
        modeId,
        goalId: row.goalId ?? undefined,
        projectId: row.projectId ?? undefined,
        milestoneId: row.milestoneId ?? undefined,
        dueDate: null,
        dueTime: null,
      },
      {
        onSuccess: () => {
          setAddTaskTitle("");
          setExpandedAddTask(null);
        },
      }
    );
  }, [addTaskTitle, modeId, createTask]);

  const rows = useMemo(() => {
    const result: TreeRow[] = [];

    const pushTasks = (
      filter: (t: typeof tasks[0]) => boolean,
      depth: number
    ) => {
      for (const t of tasks.filter(filter)) {
        result.push({
          kind: "entity",
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
        kind: "entity",
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
        result.push({
          kind: "add-task",
          key: `add-task-milestone-${ms.id}`,
          depth: depth + 1,
          goalId: ms.goalId ?? null,
          projectId: ms.projectId ?? null,
          milestoneId: ms.id,
        });
      }
    };

    const pushProject = (proj: typeof projects[0], depth: number) => {
      const subProjects = projects.filter((p) => p.parentId === proj.id);
      const projMs = milestones.filter((m) => m.projectId === proj.id && !m.parentId);
      const projTasks = tasks.filter((t) => t.projectId === proj.id && !t.milestoneId);
      result.push({
        kind: "entity",
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
        result.push({
          kind: "add-task",
          key: `add-task-project-${proj.id}`,
          depth: depth + 1,
          goalId: proj.goalId ?? null,
          projectId: proj.id,
          milestoneId: null,
        });
      }
    };

    if (entityType === "goal") {
      for (const proj of projects.filter((p) => p.goalId === entityId && !p.parentId)) {
        pushProject(proj, 0);
      }
      for (const ms of milestones.filter((m) => m.goalId === entityId && !m.projectId && !m.parentId)) {
        pushMilestone(ms, 0);
      }
      pushTasks((t) => t.goalId === entityId && !t.projectId && !t.milestoneId, 0);
      result.push({
        kind: "add-task",
        key: `add-task-goal-${entityId}`,
        depth: 0,
        goalId: entityId,
        projectId: null,
        milestoneId: null,
      });
    }

    if (entityType === "project") {
      for (const proj of projects.filter((p) => p.parentId === entityId)) {
        pushProject(proj, 0);
      }
      for (const ms of milestones.filter((m) => m.projectId === entityId && !m.parentId)) {
        pushMilestone(ms, 0);
      }
      pushTasks((t) => t.projectId === entityId && !t.milestoneId, 0);
      const proj = projects.find((p) => p.id === entityId);
      result.push({
        kind: "add-task",
        key: `add-task-project-root-${entityId}`,
        depth: 0,
        goalId: proj?.goalId ?? null,
        projectId: entityId,
        milestoneId: null,
      });
    }

    if (entityType === "milestone") {
      for (const ms of milestones.filter((m) => m.parentId === entityId)) {
        pushMilestone(ms, 0);
      }
      pushTasks((t) => t.milestoneId === entityId, 0);
      const ms = milestones.find((m) => m.id === entityId);
      result.push({
        kind: "add-task",
        key: `add-task-milestone-root-${entityId}`,
        depth: 0,
        goalId: ms?.goalId ?? null,
        projectId: ms?.projectId ?? null,
        milestoneId: entityId,
      });
    }

    return result;
  }, [entityType, entityId, projects, milestones, tasks, collapsed]);

  const entityRows = rows.filter((r) => r.kind === "entity");
  const isEmpty = entityRows.length === 0;

  if (isEmpty) {
    return (
      <View style={{ flex: 1, paddingVertical: 12 }}>
        {entityTitle && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingBottom: 16 }}>
            <EntityIcon type={entityType} size={20} color={modeColor} />
            <Text style={{ ...textLine(16), fontWeight: "700", color: "#111", flex: 1 }} numberOfLines={1}>
              {entityTitle}
            </Text>
          </View>
        )}
        {/* Still show the add-task row even when empty */}
        {rows.filter((r) => r.kind === "add-task").map((row) => {
          const r = row as AddTaskRow;
          return renderAddTaskRow(r, expandedAddTask, setExpandedAddTask, addTaskTitle, setAddTaskTitle, handleAddTask, modeColor, saveTextColor, createTask.isPending);
        })}
        {entityRows.length === 0 && rows.filter((r) => r.kind === "add-task").length === 0 && (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 28 }}>
            <View style={{ borderWidth: 1, borderStyle: "dashed", borderColor: "#d1d5db", borderRadius: 8, paddingVertical: 24, paddingHorizontal: 32, alignItems: "center" }}>
              <Feather name="git-branch" size={24} color="#9ca3af" />
              <Text style={{ ...textLine(14), color: "#9ca3af", fontStyle: "italic", marginTop: 8 }}>No child entities</Text>
            </View>
          </View>
        )}
      </View>
    );
  }

  const header = entityTitle ? (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8 }}>
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
      contentContainerStyle={{ padding: 12, paddingBottom: Math.max(40, insets.bottom + 12) }}
      keyboardShouldPersistTaps="handled"
      renderItem={({ item }) => {
        if (item.kind === "add-task") {
          return renderAddTaskRow(item, expandedAddTask, setExpandedAddTask, addTaskTitle, setAddTaskTitle, handleAddTask, modeColor, saveTextColor, createTask.isPending);
        }

        const row = item as EntityRow;
        const isCompleted = row.isCompleted;

        return (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 9,
              paddingHorizontal: 12,
              paddingLeft: 12 + row.depth * 20,
              marginVertical: 2,
              borderRadius: 8,
              backgroundColor: "#fff",
              borderWidth: 1,
              borderColor: "#f3f4f6",
              borderLeftWidth: 3,
              borderLeftColor: modeColor,
            }}
          >
            {/* Icon (collapse toggle for non-tasks) */}
            <TouchableOpacity
              onPress={() => row.childCount > 0 && toggleCollapse(row.key)}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 4 }}
              style={{ padding: 4 }}
              activeOpacity={row.childCount > 0 ? 0.6 : 1}
            >
              <EntityIcon
                type={row.type}
                size={18}
                color={isCompleted ? "#9ca3af" : modeColor}
              />
            </TouchableOpacity>

            {/* Title */}
            <TouchableOpacity
              onPress={() => onNavigate(row.type, row.id)}
              activeOpacity={0.7}
              style={{ flex: 1, marginLeft: 8 }}
            >
              <Text
                style={{
                  ...textLine(row.type === "task" ? 14 : 15),
                  fontWeight: row.type === "task" ? "400" : "500",
                  color: isCompleted ? "#9ca3af" : "#111",
                  textDecorationLine: isCompleted ? "line-through" : "none",
                }}
              >
                {row.title}
              </Text>
            </TouchableOpacity>

            {/* Collapse chevron */}
            {row.childCount > 0 && (
              <TouchableOpacity
                onPress={() => toggleCollapse(row.key)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ marginLeft: 6, padding: 4 }}
              >
                <Feather
                  name={collapsed.has(row.key) ? "chevron-right" : "chevron-down"}
                  size={14}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            )}

            {/* Checkbox */}
            <TouchableOpacity
              onPress={() => toggleCompleted(row)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ marginLeft: 8 }}
            >
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: row.type === "task" ? 9 : 4,
                  borderWidth: 2,
                  borderColor: isCompleted ? modeColor : "#d1d5db",
                  backgroundColor: isCompleted ? modeColor : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isCompleted && <Feather name="check" size={11} color={saveTextColor} />}
              </View>
            </TouchableOpacity>
          </View>
        );
      }}
    />
  );
}

function renderAddTaskRow(
  row: AddTaskRow,
  expandedAddTask: string | null,
  setExpandedAddTask: (key: string | null) => void,
  addTaskTitle: string,
  setAddTaskTitle: (v: string) => void,
  handleAddTask: (row: AddTaskRow) => void,
  modeColor: string,
  saveTextColor: string,
  isPending: boolean,
) {
  const isExpanded = expandedAddTask === row.key;
  const indent = 12 + row.depth * 20;

  if (!isExpanded) {
    return (
      <TouchableOpacity
        key={row.key}
        onPress={() => {
          setExpandedAddTask(row.key);
          setAddTaskTitle("");
        }}
        style={{ paddingLeft: indent, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 6 }}
        activeOpacity={0.6}
      >
        <Feather name="plus" size={13} color={modeColor} />
        <Text style={{ fontSize: 13, color: modeColor, fontWeight: "500" }}>Add Task</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View
      key={row.key}
      style={{
        marginVertical: 4,
        marginLeft: indent,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        backgroundColor: "#f9fafb",
        padding: 10,
      }}
    >
      <TextInput
        value={addTaskTitle}
        onChangeText={setAddTaskTitle}
        placeholder="Task title"
        autoFocus
        style={{
          borderWidth: 1,
          borderColor: "#d1d5db",
          borderRadius: 6,
          paddingHorizontal: 10,
          paddingVertical: 7,
          fontSize: 14,
          backgroundColor: "#fff",
          marginBottom: 8,
        }}
        onSubmitEditing={() => handleAddTask(row)}
        returnKeyType="done"
      />
      <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
        <TouchableOpacity
          onPress={() => { setExpandedAddTask(null); setAddTaskTitle(""); }}
          style={{ paddingVertical: 6, paddingHorizontal: 12 }}
        >
          <Text style={{ fontSize: 13, color: "#6b7280" }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleAddTask(row)}
          disabled={!addTaskTitle.trim() || isPending}
          style={{
            paddingVertical: 6,
            paddingHorizontal: 14,
            borderRadius: 6,
            backgroundColor: addTaskTitle.trim() ? modeColor : "#d1d5db",
          }}
        >
          {isPending ? (
            <ActivityIndicator size="small" color={saveTextColor} />
          ) : (
            <Text style={{ fontSize: 13, fontWeight: "600", color: addTaskTitle.trim() ? saveTextColor : "#9ca3af" }}>
              Create
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
