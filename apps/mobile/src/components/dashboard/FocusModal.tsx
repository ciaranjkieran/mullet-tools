import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
  Animated,
  Keyboard,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useWhiteNavBar } from "../../lib/hooks/useWhiteNavBar";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import EntityIcon from "../EntityIcon";
import { useGoalStore } from "@shared/store/useGoalStore";
import { useProjectStore } from "@shared/store/useProjectStore";
import { useMilestoneStore } from "@shared/store/useMilestoneStore";
import { useTaskStore } from "@shared/store/useTaskStore";
import { useModeStore } from "@shared/store/useModeStore";
import { useCreateTask } from "@shared/api/hooks/tasks/useCreateTask";
import { useDeleteGoal } from "@shared/api/hooks/goals/useDeleteGoal";
import { useDeleteProject } from "@shared/api/hooks/projects/useDeleteProject";
import { useDeleteMilestone } from "@shared/api/hooks/milestones/useDeleteMilestone";
import { useDeleteTask } from "@shared/api/hooks/tasks/useDeleteTask";
import { useEntityFormStore } from "../../lib/store/useEntityFormStore";
import {
  useFocusModalStore,
  type FocusEntityType,
} from "../../lib/store/useFocusModalStore";
import { getContrastingText } from "@shared/utils/getContrastingText";
import { cardShadow, textLine } from "../../lib/styles/platform";
import type { Goal } from "@shared/types/Goal";
import type { Project } from "@shared/types/Project";
import type { Milestone } from "@shared/types/Milestone";
import type { Task } from "@shared/types/Task";
import type { EntityFormType } from "../../lib/store/useEntityFormStore";

// ── Row types ──────────────────────────────────────────────

type EntityRow = {
  kind: "entity";
  key: string;
  id: number;
  type: EntityFormType;
  entity: Goal | Project | Milestone | Task;
  title: string;
  depth: number;
  isCompleted: boolean;
  hasChildren: boolean;
};

type AddTaskRow = {
  kind: "add-task";
  key: string;
  depth: number;
  goalId: number | null;
  projectId: number | null;
  milestoneId: number | null;
  label?: string;
};

type FocusRow = EntityRow | AddTaskRow;

// ── Component ──────────────────────────────────────────────

export default function FocusModal() {
  const visible = useFocusModalStore((s) => s.visible);
  const stack = useFocusModalStore((s) => s.stack);
  const pushFocus = useFocusModalStore((s) => s.pushFocus);
  const popFocus = useFocusModalStore((s) => s.popFocus);
  const closeFocus = useFocusModalStore((s) => s.close);
  const openEdit = useEntityFormStore((s) => s.openEdit);

  useWhiteNavBar(visible, "light");

  const frame = stack[stack.length - 1];

  if (!visible || !frame) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={popFocus}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <FocusModalContent
          key={`${frame.entityType}-${frame.entity.id}`}
          entityType={frame.entityType}
          entity={frame.entity}
          modeColor={frame.modeColor}
          modeId={frame.modeId}
          stackDepth={stack.length}
          onBack={popFocus}
          onClose={closeFocus}
          onPushFocus={pushFocus}
          onOpenEdit={openEdit}
        />
      </SafeAreaView>
    </Modal>
  );
}

// ── Inner content ──────────────────────────────────────────

type ContentProps = {
  entityType: FocusEntityType;
  entity: Goal | Project | Milestone;
  modeColor: string;
  modeId: number;
  stackDepth: number;
  onBack: () => void;
  onClose: () => void;
  onPushFocus: (type: FocusEntityType, entity: any, modeColor: string, modeId: number) => void;
  onOpenEdit: (type: EntityFormType, entity: any) => void;
};

function FocusModalContent({
  entityType,
  entity,
  modeColor,
  modeId,
  stackDepth,
  onBack,
  onClose,
  onPushFocus,
  onOpenEdit,
}: ContentProps) {
  const projects = useProjectStore((s) => s.projects);
  const milestones = useMilestoneStore((s) => s.milestones);
  const tasks = useTaskStore((s) => s.tasks);
  const qc = useQueryClient();

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [expandedAddTask, setExpandedAddTask] = useState<string | null>(null);
  const [addTaskTitle, setAddTaskTitle] = useState("");

  const saveTextColor = getContrastingText(modeColor);

  const createTask = useCreateTask();
  const deleteGoal = useDeleteGoal();
  const deleteProject = useDeleteProject();
  const deleteMilestone = useDeleteMilestone();
  const deleteTask = useDeleteTask();

  const toggleCollapse = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const invalidateTimer = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["activeTimer"], exact: false });
    qc.invalidateQueries({ queryKey: ["timer"], exact: false });
    qc.invalidateQueries({ queryKey: ["time-entries"], exact: false });
    qc.invalidateQueries({ queryKey: ["timeEntries"], exact: false });
  }, [qc]);

  const toggleCompleted = useCallback(
    (row: EntityRow) => {
      switch (row.type) {
        case "goal":
          deleteGoal.mutate(row.id, { onSuccess: invalidateTimer });
          break;
        case "project":
          deleteProject.mutate(row.id, { onSuccess: invalidateTimer });
          break;
        case "milestone":
          deleteMilestone.mutate(row.id, { onSuccess: invalidateTimer });
          break;
        case "task":
          deleteTask.mutate(row.id, { onSuccess: invalidateTimer });
          break;
      }
    },
    [deleteGoal, deleteProject, deleteMilestone, deleteTask, invalidateTimer]
  );

  const handleAddTask = useCallback(
    (row: AddTaskRow) => {
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
    },
    [addTaskTitle, modeId, createTask]
  );

  // ── Build rows ──────────────────────────────────────────

  const rows = useMemo(() => {
    const result: FocusRow[] = [];

    const pushTasks = (
      filter: (t: Task) => boolean,
      depth: number
    ) => {
      for (const t of tasks.filter(filter)) {
        result.push({
          kind: "entity",
          key: `task-${t.id}`,
          id: t.id,
          type: "task",
          entity: t,
          title: t.title,
          depth,
          isCompleted: t.isCompleted,
          hasChildren: false,
        });
      }
    };

    const pushMilestone = (ms: Milestone, depth: number) => {
      const msTasks = tasks.filter((t) => t.milestoneId === ms.id);
      const childMs = milestones.filter((m) => m.parentId === ms.id);
      const hasChildren = msTasks.length + childMs.length > 0;
      result.push({
        kind: "entity",
        key: `milestone-${ms.id}`,
        id: ms.id,
        type: "milestone",
        entity: ms,
        title: ms.title,
        depth,
        isCompleted: ms.isCompleted,
        hasChildren,
      });
      if (!collapsed.has(`milestone-${ms.id}`)) {
        for (const child of childMs) pushMilestone(child, depth + 1);
        pushTasks((t) => t.milestoneId === ms.id, depth + 1);
      }
    };

    const pushProject = (proj: Project, depth: number) => {
      const subProjects = projects.filter((p) => p.parentId === proj.id);
      const projMs = milestones.filter(
        (m) => m.projectId === proj.id && m.parentId == null
      );
      const projTasks = tasks.filter(
        (t) => t.projectId === proj.id && t.milestoneId == null
      );
      const hasChildren =
        subProjects.length + projMs.length + projTasks.length > 0;
      result.push({
        kind: "entity",
        key: `project-${proj.id}`,
        id: proj.id,
        type: "project",
        entity: proj,
        title: proj.title,
        depth,
        isCompleted: proj.isCompleted,
        hasChildren,
      });
      if (!collapsed.has(`project-${proj.id}`)) {
        for (const sub of subProjects) pushProject(sub, depth + 1);
        for (const ms of projMs) pushMilestone(ms, depth + 1);
        pushTasks(
          (t) => t.projectId === proj.id && t.milestoneId == null,
          depth + 1
        );
      }
    };

    if (entityType === "goal") {
      // Tasks directly under the goal (no project or milestone)
      pushTasks(
        (t) =>
          t.goalId === entity.id && t.projectId == null && t.milestoneId == null,
        0
      );
      for (const ms of milestones.filter(
        (m) =>
          m.goalId === entity.id && m.projectId == null && m.parentId == null
      ))
        pushMilestone(ms, 0);
      for (const proj of projects.filter(
        (p) => p.goalId === entity.id && p.parentId == null
      ))
        pushProject(proj, 0);
      result.push({
        kind: "add-task",
        key: `add-task-goal-${entity.id}`,
        depth: 0,
        goalId: entity.id,
        projectId: null,
        milestoneId: null,
      });
    }

    if (entityType === "project") {
      const proj = entity as Project;
      // Tasks directly under the project (no milestone)
      pushTasks(
        (t) => t.projectId === entity.id && t.milestoneId == null,
        0
      );
      for (const ms of milestones.filter(
        (m) => m.projectId === entity.id && m.parentId == null
      ))
        pushMilestone(ms, 0);
      for (const sub of projects.filter((p) => p.parentId === entity.id))
        pushProject(sub, 0);
      result.push({
        kind: "add-task",
        key: `add-task-proj-root-${entity.id}`,
        depth: 0,
        goalId: proj.goalId ?? null,
        projectId: entity.id,
        milestoneId: null,
      });
    }

    if (entityType === "milestone") {
      const ms = entity as Milestone;
      // Tasks directly under the milestone
      pushTasks((t) => t.milestoneId === entity.id, 0);
      for (const child of milestones.filter((m) => m.parentId === entity.id))
        pushMilestone(child, 0);
      result.push({
        kind: "add-task",
        key: `add-task-ms-root-${entity.id}`,
        depth: 0,
        goalId: ms.goalId ?? null,
        projectId: ms.projectId ?? null,
        milestoneId: entity.id,
      });
    }

    return result;
  }, [entityType, entity, projects, milestones, tasks, collapsed]);

  // ── Render ──────────────────────────────────────────────

  const header = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
      }}
    >
      {/* Back / Close */}
      <TouchableOpacity
        onPress={onBack}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={{ marginRight: 12 }}
      >
        <Feather
          name={stackDepth > 1 ? "arrow-left" : "x"}
          size={22}
          color="#374151"
        />
      </TouchableOpacity>

      {/* Entity icon */}
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: modeColor,
          justifyContent: "center",
          alignItems: "center",
          marginRight: 10,
        }}
      >
        <EntityIcon type={entityType} size={16} color="#fff" />
      </View>

      {/* Title */}
      <TouchableOpacity
        onPress={() => onOpenEdit(entityType, entity)}
        style={{ flex: 1 }}
        activeOpacity={0.6}
      >
        <Text
          style={{ ...textLine(17), fontWeight: "700", color: "#111" }}
          numberOfLines={1}
        >
          {entity.title}
        </Text>
      </TouchableOpacity>

      {/* Close all (when nested) */}
      {stackDepth > 1 && (
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ marginLeft: 12 }}
        >
          <Feather name="x" size={20} color="#9ca3af" />
        </TouchableOpacity>
      )}
    </View>
  );

  const flatListRef = useRef<FlatList>(null);
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = (e: any) => setKbHeight(e.endCoordinates.height);
    const onHide = () => setKbHeight(0);
    const sub1 = Keyboard.addListener(showEvent, onShow);
    const sub2 = Keyboard.addListener(hideEvent, onHide);
    return () => { sub1.remove(); sub2.remove(); };
  }, []);

  const handleExpandAddTask = useCallback(
    (key: string | null) => {
      setExpandedAddTask(key);
      if (key == null) return;
      setAddTaskTitle("");
      // Scroll to the add-task row after keyboard appears
      setTimeout(() => {
        const idx = rows.findIndex((r) => r.key === key);
        if (idx >= 0 && flatListRef.current) {
          flatListRef.current.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
        }
      }, 350);
    },
    [rows]
  );

  return (
    <View style={{ flex: 1 }}>
      {header}
      <FlatList
        ref={flatListRef}
        data={rows}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ padding: 12, paddingBottom: Math.max(120, kbHeight + 40) }}
        keyboardShouldPersistTaps="handled"
        onScrollToIndexFailed={() => {}}
        renderItem={({ item }) => {
          if (item.kind === "add-task") {
            return (
              <AddTaskRowView
                row={item}
                expandedAddTask={expandedAddTask}
                setExpandedAddTask={handleExpandAddTask}
                addTaskTitle={addTaskTitle}
                setAddTaskTitle={setAddTaskTitle}
                handleAddTask={handleAddTask}
                modeColor={modeColor}
                saveTextColor={saveTextColor}
                isPending={createTask.isPending}
              />
            );
          }

          const row = item as EntityRow;
          return (
            <FocusEntityRow
              row={row}
              modeColor={modeColor}
              modeId={modeId}
              collapsed={collapsed}
              toggleCollapse={toggleCollapse}
              toggleCompleted={toggleCompleted}
              onPushFocus={onPushFocus}
              onOpenEdit={onOpenEdit}
            />
          );
        }}
      />
    </View>
  );
}

// ── Add Task Row ──────────────────────────────────────────

// ── Entity Row (with check animation + fade) ─────────────

function FocusEntityRow({
  row,
  modeColor,
  modeId,
  collapsed,
  toggleCollapse,
  toggleCompleted,
  onPushFocus,
  onOpenEdit,
}: {
  row: EntityRow;
  modeColor: string;
  modeId: number;
  collapsed: Set<string>;
  toggleCollapse: (key: string) => void;
  toggleCompleted: (row: EntityRow) => void;
  onPushFocus: (type: FocusEntityType, entity: any, modeColor: string, modeId: number) => void;
  onOpenEdit: (type: EntityFormType, entity: any) => void;
}) {
  const isParent =
    row.type === "goal" ||
    row.type === "project" ||
    row.type === "milestone";
  const isExpanded = isParent && !collapsed.has(row.key);

  const [checked, setChecked] = useState(false);
  const [opacity] = useState(() => new Animated.Value(1));

  const handleCheck = useCallback(() => {
    if (checked) return;
    setChecked(true);
    toggleCompleted(row);
    Animated.timing(opacity, {
      toValue: 0,
      duration: 350,
      delay: 100,
      useNativeDriver: true,
    }).start();
  }, [checked, opacity, row, toggleCompleted]);

  return (
    <Animated.View
      style={{
        opacity,
        marginLeft: row.depth * 16,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 8,
        backgroundColor: "#fff",
        padding: 12,
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        ...cardShadow("sm"),
      }}
    >
      {/* Left: icon + title */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          flex: 1,
          minWidth: 0,
          gap: 10,
        }}
      >
        {isParent && row.hasChildren ? (
          <TouchableOpacity
            onPress={() => toggleCollapse(row.key)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              width: 24,
              height: 24,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <EntityIcon type={row.type} size={20} color={modeColor} />
          </TouchableOpacity>
        ) : (
          <View
            style={{
              width: 24,
              height: 24,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <EntityIcon
              type={row.type}
              size={row.type === "task" ? 16 : 20}
              color={modeColor}
            />
          </View>
        )}

        <TouchableOpacity
          onPress={() => onOpenEdit(row.type, row.entity)}
          style={{ flex: 1, minWidth: 0 }}
          activeOpacity={0.6}
        >
          <Text
            style={{
              ...textLine(row.type === "task" ? 14 : 15),
              fontWeight: row.type === "task" ? "400" : "600",
              color: checked || row.isCompleted ? "#9ca3af" : "#111",
              textDecorationLine: checked || row.isCompleted ? "line-through" : "none",
            }}
          >
            {row.title}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Right: scope icon or checkbox */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginLeft: 8,
        }}
      >
        {isParent && isExpanded && row.hasChildren ? (
          <TouchableOpacity
            onPress={() =>
              onPushFocus(row.type as FocusEntityType, row.entity, modeColor, modeId)
            }
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="crosshair" size={20} color={modeColor} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleCheck}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather
              name={checked || row.isCompleted ? "check-square" : "square"}
              size={20}
              color={checked || row.isCompleted ? modeColor : modeColor}
            />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

// ── Add Task Row ──────────────────────────────────────────

function AddTaskRowView({
  row,
  expandedAddTask,
  setExpandedAddTask,
  addTaskTitle,
  setAddTaskTitle,
  handleAddTask,
  modeColor,
  saveTextColor,
  isPending,
}: {
  row: AddTaskRow;
  expandedAddTask: string | null;
  setExpandedAddTask: (key: string | null) => void;
  addTaskTitle: string;
  setAddTaskTitle: (v: string) => void;
  handleAddTask: (row: AddTaskRow) => void;
  modeColor: string;
  saveTextColor: string;
  isPending: boolean;
}) {
  const isExpanded = expandedAddTask === row.key;
  const indent = row.depth * 16;

  if (!isExpanded) {
    return (
      <TouchableOpacity
        onPress={() => {
          setExpandedAddTask(row.key);
          setAddTaskTitle("");
        }}
        style={{
          paddingLeft: indent + 12,
          paddingVertical: 6,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        }}
        activeOpacity={0.6}
      >
        <Feather name="plus" size={13} color={modeColor} />
        <Text style={{ fontSize: 13, color: modeColor, fontWeight: "500" }}>
          Add Task
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View
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
      <View
        style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}
      >
        <TouchableOpacity
          onPress={() => {
            setExpandedAddTask(null);
            setAddTaskTitle("");
          }}
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
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: addTaskTitle.trim() ? saveTextColor : "#9ca3af",
              }}
            >
              Create
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
