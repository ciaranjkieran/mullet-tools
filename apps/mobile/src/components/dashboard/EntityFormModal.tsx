import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useWhiteNavBar } from "../../lib/hooks/useWhiteNavBar";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import EntityIcon from "../EntityIcon";
import { useNavigation } from "@react-navigation/native";
import { useCreateGoal } from "@shared/api/hooks/goals/useCreateGoal";
import { useCreateProject } from "@shared/api/hooks/projects/useCreateProject";
import { useCreateMilestone } from "@shared/api/hooks/milestones/useCreateMilestone";
import { useCreateTask } from "@shared/api/hooks/tasks/useCreateTask";
import { useUpdateGoal } from "@shared/api/hooks/goals/useUpdateGoal";
import { useUpdateProject } from "@shared/api/hooks/projects/useUpdateProject";
import { useUpdateMilestone } from "@shared/api/hooks/milestones/useUpdateMilestone";
import { useUpdateTask } from "@shared/api/hooks/tasks/useUpdateTask";
import { useDeleteGoal } from "@shared/api/hooks/goals/useDeleteGoal";
import { useDeleteProject } from "@shared/api/hooks/projects/useDeleteProject";
import { useDeleteMilestone } from "@shared/api/hooks/milestones/useDeleteMilestone";
import { useDeleteTask } from "@shared/api/hooks/tasks/useDeleteTask";
import { useGoalStore } from "@shared/store/useGoalStore";
import { useProjectStore } from "@shared/store/useProjectStore";
import { useMilestoneStore } from "@shared/store/useMilestoneStore";
import { useTaskStore } from "@shared/store/useTaskStore";
import { useModeStore } from "@shared/store/useModeStore";
import { useViewStore } from "@shared/store/useViewStore";
import { useTemplateWorkbenchStore } from "@shared/store/useTemplateWorkbenchStore";
import {
  filterEditorOptions,
  reconcileAfterChange,
} from "@shared/lineage/editorFilter";
import { toTimerPath, type EntityRef } from "@shared/lineage/toTimerPath";
import { pathToSelection } from "@shared/lineage/pathToSelection";
import { buildMilestonePayload, buildProjectPayload, buildTaskPayload } from "@shared/lineage/xor";
import {
  projectToTemplateData,
  milestoneToTemplateData,
} from "@shared/utils/toTemplate";
import { useTimerLaunchStore } from "../../lib/store/useTimerLaunchStore";
import type { Goal } from "@shared/types/Goal";
import type { Project } from "@shared/types/Project";
import type { Milestone } from "@shared/types/Milestone";
import type { Task } from "@shared/types/Task";
import type { Mode } from "@shared/types/Mode";
import { useEntityFormStore, type EntityFormType } from "../../lib/store/useEntityFormStore";
import DropdownPicker from "./DropdownPicker";
import CommentsTab from "./CommentsTab";
import NotesTab from "./NotesTab";
import StructureTab from "./StructureTab";
import BoardsTab from "./BoardsTab";
import StatsTab from "./StatsTab";
import AssigneePicker from "../collaboration/AssigneePicker";

type ActiveTab = "details" | "structure" | "comments" | "notes" | "boards" | "stats";

type TabDef = {
  key: ActiveTab;
  icon: keyof typeof Feather.glyphMap;
};

const ALL_TABS: TabDef[] = [
  { key: "details", icon: "edit-3" },
  { key: "structure", icon: "git-branch" },
  { key: "comments", icon: "message-square" },
  { key: "notes", icon: "edit" },
  { key: "boards", icon: "grid" },
  { key: "stats", icon: "bar-chart-2" },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  entityType: EntityFormType;
  editEntity: Goal | Project | Milestone | Task | null;
  defaultModeId: number;
};

const LABELS: Record<EntityFormType, string> = {
  goal: "Goal",
  project: "Project",
  milestone: "Milestone",
  task: "Task",
};

export default function EntityFormModal({
  visible,
  onClose,
  entityType,
  editEntity,
  defaultModeId,
}: Props) {
  useWhiteNavBar(visible);
  const isEdit = !!editEntity;
  const [activeTab, setActiveTab] = useState<ActiveTab>("details");
  const navigation = useNavigation<any>();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [dueTime, setDueTime] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [goalId, setGoalId] = useState<number | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [milestoneId, setMilestoneId] = useState<number | null>(null);
  const [parentProjectId, setParentProjectId] = useState<number | null>(null);
  const [parentMilestoneId, setParentMilestoneId] = useState<number | null>(null);
  const [assignedToId, setAssignedToId] = useState<number | null>(null);

  // Parent pickers — read from stores
  const goals = useGoalStore((s) => s.goals);
  const projects = useProjectStore((s) => s.projects);
  const milestones = useMilestoneStore((s) => s.milestones);
  const tasks = useTaskStore((s) => s.tasks);
  const modes = useModeStore((s) => (s as any).modes as Mode[] | undefined) ?? [];
  const modeColor = modes.find((m) => m.id === defaultModeId)?.color ?? "#6b7280";

  // Tabs available for current entity type
  const visibleTabs = useMemo(() => {
    if (!isEdit) return [];
    return ALL_TABS.filter((t) => {
      if (t.key === "structure" && entityType === "task") return false;
      return true;
    });
  }, [isEdit, entityType]);

  // Build selection object matching web's per-entity-type mapping:
  // - Milestone form: parentMilestoneId → sel.milestoneId, projectId → sel.projectId
  // - Project form: parentProjectId → sel.projectId, no milestoneId
  // - Task form: milestoneId, projectId, goalId as-is
  const sel = useMemo(() => {
    if (entityType === "milestone") {
      return { modeId: defaultModeId, goalId, projectId, milestoneId: parentMilestoneId };
    }
    if (entityType === "project") {
      return { modeId: defaultModeId, goalId, projectId: parentProjectId, milestoneId: null };
    }
    return { modeId: defaultModeId, goalId, projectId, milestoneId };
  }, [entityType, defaultModeId, goalId, projectId, milestoneId, parentMilestoneId, parentProjectId]);

  const milestoneDatasets = useMemo(
    () => ({ modes, goals, projects, milestones }),
    [modes, goals, projects, milestones]
  );

  const projectDatasets = useMemo(
    () => ({ modes, goals, projects, milestones: [] as typeof milestones }),
    [modes, goals, projects]
  );

  // Use entity-appropriate datasets (web project form passes milestones: [])
  const activeDatasets = entityType === "project" ? projectDatasets : milestoneDatasets;

  // Cascading-filtered options
  const filtered = useMemo(
    () => filterEditorOptions(sel, activeDatasets),
    [sel, activeDatasets]
  );

  // Cascading onChange handlers — apply reconciled values back to correct state vars
  const applyRec = useCallback(
    (next: { modeId: number; goalId: number | null; projectId: number | null; milestoneId: number | null }) => {
      setGoalId(next.goalId);
      if (entityType === "milestone") {
        setProjectId(next.projectId);
        setParentMilestoneId(next.milestoneId);
      } else if (entityType === "project") {
        setParentProjectId(next.projectId);
      } else {
        setProjectId(next.projectId);
        setMilestoneId(next.milestoneId);
      }
    },
    [entityType]
  );

  const handleGoalChange = useCallback(
    (id: number | null) => {
      const next = reconcileAfterChange(sel, { goalId: id }, activeDatasets);
      applyRec(next);
    },
    [sel, activeDatasets, applyRec]
  );

  const handleProjectChange = useCallback(
    (id: number | null) => {
      const next = reconcileAfterChange(sel, { projectId: id }, activeDatasets);
      applyRec(next);
    },
    [sel, activeDatasets, applyRec]
  );

  const handleMilestoneChange = useCallback(
    (id: number | null) => {
      const next = reconcileAfterChange(sel, { milestoneId: id }, activeDatasets);
      applyRec(next);
    },
    [sel, activeDatasets, applyRec]
  );

  // Mutations
  const createGoal = useCreateGoal();
  const createProject = useCreateProject();
  const createMilestone = useCreateMilestone();
  const createTask = useCreateTask();
  const updateGoal = useUpdateGoal();
  const updateProject = useUpdateProject();
  const updateMilestone = useUpdateMilestone();
  const updateTask = useUpdateTask();
  const deleteGoal = useDeleteGoal();
  const deleteProject = useDeleteProject();
  const deleteMilestone = useDeleteMilestone();
  const deleteTask = useDeleteTask();

  const isPending =
    createGoal.isPending ||
    createProject.isPending ||
    createMilestone.isPending ||
    createTask.isPending ||
    updateGoal.isPending ||
    updateProject.isPending ||
    updateMilestone.isPending ||
    updateTask.isPending;

  const initialTab = useEntityFormStore((s) => s.initialTab);
  const defaultDate = useEntityFormStore((s) => s.defaultDate);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setActiveTab((initialTab as ActiveTab) || "details");
      if (editEntity) {
        setTitle(editEntity.title);
        setDueDate(editEntity.dueDate ?? null);
        setDueTime((editEntity as any).dueTime ?? null);
        if ("description" in editEntity) {
          setDescription((editEntity as Goal | Project).description ?? "");
        } else {
          setDescription("");
        }
        if ("goalId" in editEntity) {
          setGoalId((editEntity as any).goalId ?? null);
        }
        if ("projectId" in editEntity) {
          setProjectId((editEntity as any).projectId ?? null);
        }
        if ("milestoneId" in editEntity) {
          setMilestoneId((editEntity as any).milestoneId ?? null);
        }
        if ("parentId" in editEntity) {
          if (entityType === "milestone") {
            setParentMilestoneId((editEntity as any).parentId ?? null);
          } else {
            setParentProjectId((editEntity as any).parentId ?? null);
          }
        }
        setAssignedToId((editEntity as any).assignedToId ?? null);
      } else {
        setTitle("");
        setDescription("");
        setDueDate(defaultDate);
        setDueTime(null);
        setGoalId(null);
        setProjectId(null);
        setMilestoneId(null);
        setParentProjectId(null);
        setParentMilestoneId(null);
        setAssignedToId(null);
      }
    }
  }, [visible, editEntity]);

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || submitting) return;
    setSubmitting(true);

    try {
      if (isEdit) {
        // Update
        switch (entityType) {
          case "goal":
            await updateGoal.mutateAsync({
              id: editEntity!.id,
              title: title.trim(),
              description: description || null,
              dueDate: dueDate,
              dueTime: dueTime || null,
              assignedToId,
            });
            break;
          case "project": {
            const { parentId: nParent, goalId: nGoal } = buildProjectPayload({
              modeId: defaultModeId,
              parentId: parentProjectId,
              goalId,
            });
            await updateProject.mutateAsync({
              id: editEntity!.id,
              title: title.trim(),
              description: description || null,
              dueDate: dueDate,
              dueTime: dueTime || null,
              parentId: nParent,
              goalId: nGoal,
              assignedToId,
            });
            break;
          }
          case "milestone": {
            const { parentId: nParent, projectId: nProj, goalId: nGoal } = buildMilestonePayload({
              title: title.trim(),
              modeId: defaultModeId,
              dueDate: dueDate || null,
              dueTime: dueTime || null,
              parentId: parentMilestoneId,
              projectId,
              goalId,
            });
            await updateMilestone.mutateAsync({
              id: editEntity!.id,
              title: title.trim(),
              dueDate: dueDate,
              dueTime: dueTime || null,
              parentId: nParent,
              projectId: nProj,
              goalId: nGoal,
              assignedToId,
            });
            break;
          }
          case "task": {
            const { milestoneId: nMs, projectId: nProj, goalId: nGoal } = buildTaskPayload({
              modeId: defaultModeId,
              milestoneId,
              projectId,
              goalId,
            });
            await updateTask.mutateAsync({
              id: editEntity!.id,
              title: title.trim(),
              dueDate: dueDate,
              dueTime: dueTime || null,
              milestoneId: nMs,
              projectId: nProj,
              goalId: nGoal,
              assignedToId,
            });
            break;
          }
        }
      } else {
        // Create
        switch (entityType) {
          case "goal":
            await createGoal.mutateAsync({
              title: title.trim(),
              modeId: defaultModeId,
              description: description || undefined,
              dueDate: dueDate,
              dueTime: dueTime || undefined,
              assignedToId,
            });
            break;
          case "project": {
            const { parentId: nParent, goalId: nGoal } = buildProjectPayload({
              modeId: defaultModeId,
              parentId: parentProjectId,
              goalId,
            });
            await createProject.mutateAsync({
              title: title.trim(),
              modeId: defaultModeId,
              description: description || undefined,
              dueDate: dueDate,
              dueTime: dueTime || undefined,
              parentId: nParent,
              goalId: nGoal,
              assignedToId,
            });
            break;
          }
          case "milestone": {
            const { parentId: nParent, projectId: nProj, goalId: nGoal } = buildMilestonePayload({
              title: title.trim(),
              modeId: defaultModeId,
              dueDate: dueDate || null,
              dueTime: dueTime || null,
              parentId: parentMilestoneId,
              projectId,
              goalId,
            });
            await createMilestone.mutateAsync({
              title: title.trim(),
              modeId: defaultModeId,
              dueDate: dueDate,
              dueTime: dueTime || undefined,
              parentId: nParent,
              projectId: nProj,
              goalId: nGoal,
              assignedToId,
            });
            break;
          }
          case "task": {
            const { milestoneId: nMs, projectId: nProj, goalId: nGoal } = buildTaskPayload({
              modeId: defaultModeId,
              milestoneId,
              projectId,
              goalId,
            });
            await createTask.mutateAsync({
              title: title.trim(),
              modeId: defaultModeId,
              dueDate: dueDate,
              dueTime: dueTime || undefined,
              milestoneId: nMs,
              projectId: nProj,
              goalId: nGoal,
              assignedToId,
            });
            break;
          }
        }
      }
      onClose();
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ??
        err?.message ??
        "Something went wrong. Please try again.";
      Alert.alert(`${isEdit ? "Save" : "Create"} Failed`, message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!editEntity) return;
    Alert.alert(
      `Delete ${LABELS[entityType]}`,
      `Delete "${editEntity.title}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            switch (entityType) {
              case "goal":
                await deleteGoal.mutateAsync(editEntity.id);
                break;
              case "project":
                await deleteProject.mutateAsync(editEntity.id);
                break;
              case "milestone":
                await deleteMilestone.mutateAsync(editEntity.id);
                break;
              case "task":
                await deleteTask.mutateAsync(editEntity.id);
                break;
            }
            onClose();
          },
        },
      ]
    );
  };

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      const iso = selectedDate.toISOString().split("T")[0];
      setDueDate(iso);
    }
  };

  const handleTimeChange = (_event: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === "ios");
    if (selectedDate) {
      const hh = String(selectedDate.getHours()).padStart(2, "0");
      const mm = String(selectedDate.getMinutes()).padStart(2, "0");
      setDueTime(`${hh}:${mm}`);
    }
  };

  const clearDate = () => {
    setDueDate(null);
    setDueTime(null);
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  const clearTime = () => {
    setDueTime(null);
    setShowTimePicker(false);
  };

  // Timer launch handler
  const handleLaunchTimer = useCallback(() => {
    if (!editEntity) return;

    const maps = {
      modesById: new Map(modes.map((m) => [m.id, m])),
      goalsById: new Map(goals.map((g) => [g.id, g])),
      projectsById: new Map(projects.map((p) => [p.id, p])),
      milestonesById: new Map(milestones.map((ms) => [ms.id, ms])),
      tasksById: new Map(tasks.map((t) => [t.id, t])),
    };

    const ref: EntityRef = { kind: entityType, id: editEntity.id };
    const timerPath = toTimerPath(ref, maps);
    const timerSel = pathToSelection(timerPath, defaultModeId);

    useTimerLaunchStore.getState().setLaunchIntent({
      modeId: timerSel.modeId,
      goalId: timerSel.goalId,
      projectId: timerSel.projectId,
      milestoneId: timerSel.milestoneId,
      taskId: timerSel.taskId,
    });

    onClose();
    navigation.navigate("Timer");
  }, [editEntity, entityType, defaultModeId, modes, goals, projects, milestones, tasks, onClose, navigation]);

  // Template launch handler (Project & Milestone only)
  const handleLaunchTemplate = useCallback(() => {
    if (!editEntity) return;

    if (entityType === "project") {
      const data = projectToTemplateData(
        editEntity as Project,
        projects,
        milestones,
        tasks
      );
      useTemplateWorkbenchStore.getState().openWithDraft({
        type: "project",
        modeId: defaultModeId,
        data,
      });
    } else if (entityType === "milestone") {
      const data = milestoneToTemplateData(
        editEntity as Milestone,
        milestones,
        tasks
      );
      useTemplateWorkbenchStore.getState().openWithDraft({
        type: "milestone",
        modeId: defaultModeId,
        data,
      });
    }

    onClose();
    useViewStore.getState().setViewType("templates");
    navigation.navigate("Home");
  }, [editEntity, entityType, defaultModeId, projects, milestones, tasks, onClose, navigation]);

  // Structure tab navigation handler
  const handleStructureNavigate = useCallback(
    (type: EntityFormType, navEntityId: number) => {
      // Find the entity in stores and open it for editing
      let entity: Goal | Project | Milestone | Task | undefined;
      switch (type) {
        case "goal":
          entity = goals.find((g) => g.id === navEntityId);
          break;
        case "project":
          entity = projects.find((p) => p.id === navEntityId);
          break;
        case "milestone":
          entity = milestones.find((m) => m.id === navEntityId);
          break;
        case "task":
          entity = tasks.find((t) => t.id === navEntityId);
          break;
      }
      if (entity) {
        onClose();
        setTimeout(() => {
          useEntityFormStore.getState().openEdit(type, entity!);
        }, 350);
      }
    },
    [goals, projects, milestones, tasks, onClose]
  );

  const insets = useSafeAreaInsets();
  const showDescription = entityType === "goal" || entityType === "project";
  const showGoalPicker = entityType !== "goal";
  const showParentProjectPicker = entityType === "project";
  const showProjectPicker =
    entityType === "milestone" || entityType === "task";
  const showMilestonePicker = entityType === "task";
  const showParentMilestonePicker = entityType === "milestone";


  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: "#e5e7eb",
          }}
        >
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: "#6b7280", fontSize: 16 }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: "600" }}>
            {isEdit ? `Edit ${LABELS[entityType]}` : `New ${LABELS[entityType]}`}
          </Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isPending || submitting || !title.trim()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            {isPending || submitting ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text
                style={{
                  color: title.trim() ? "#2563eb" : "#9ca3af",
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                {isEdit ? "Save" : "Create"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Tab bar + action buttons — only in edit mode */}
        {isEdit && (
          <View style={{ borderBottomWidth: 1, borderBottomColor: "#e5e7eb" }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {/* Scrollable tabs */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 4 }}
                style={{ flex: 1 }}
              >
                {visibleTabs.map((tab) => {
                  const isActive = activeTab === tab.key;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      onPress={() => setActiveTab(tab.key)}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        borderBottomWidth: 2,
                        borderBottomColor: isActive ? modeColor : "transparent",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <Feather
                        name={tab.icon}
                        size={15}
                        color={isActive ? modeColor : "#9ca3af"}
                      />
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: isActive ? "600" : "400",
                          color: isActive ? modeColor : "#6b7280",
                        }}
                      >
                        {tab.key.charAt(0).toUpperCase() + tab.key.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Action buttons (timer + template) */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingRight: 12,
                  paddingLeft: 6,
                  borderLeftWidth: 1,
                  borderLeftColor: "#e5e7eb",
                }}
              >
                <TouchableOpacity
                  onPress={handleLaunchTimer}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: modeColor,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Feather name="clock" size={15} color="#fff" />
                </TouchableOpacity>

                {(entityType === "project" || entityType === "milestone") && (
                  <TouchableOpacity
                    onPress={handleLaunchTemplate}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: modeColor,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Feather name="layers" size={15} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Structure tab */}
        {isEdit && activeTab === "structure" && editEntity && entityType !== "task" && (
          <StructureTab
            entityType={entityType as "goal" | "project" | "milestone"}
            entityId={editEntity.id}
            entityTitle={editEntity.title}
            modeId={defaultModeId}
            onNavigate={handleStructureNavigate}
          />
        )}

        {/* Comments tab */}
        {isEdit && activeTab === "comments" && editEntity && (
          <CommentsTab
            entityType={entityType}
            entityId={editEntity.id}
            modeId={defaultModeId}
          />
        )}

        {/* Notes tab */}
        {isEdit && activeTab === "notes" && editEntity && (
          <NotesTab
            entityType={entityType}
            entityId={editEntity.id}
            modeId={defaultModeId}
            entityTitle={editEntity.title}
            isCollab={(modes.find((m) => m.id === defaultModeId)?.collaboratorCount ?? 0) > 0}
          />
        )}

        {/* Boards tab */}
        {isEdit && activeTab === "boards" && editEntity && (
          <BoardsTab
            entityType={entityType}
            entityId={editEntity.id}
            modeId={defaultModeId}
            modeColor={modeColor}
          />
        )}

        {/* Stats tab */}
        {isEdit && activeTab === "stats" && editEntity && (
          <StatsTab
            entityType={entityType}
            entityId={editEntity.id}
            modeId={defaultModeId}
            modeColor={modeColor}
          />
        )}

        {/* Details tab (or create form) */}
        {(activeTab === "details" || !isEdit) && (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <Text style={labelStyle}>Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={`${LABELS[entityType]} title`}
            style={inputStyle}
            autoFocus={!isEdit}
          />

          {/* Description */}
          {showDescription && (
            <>
              <Text style={labelStyle}>Description</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Optional description"
                style={[inputStyle, { minHeight: 80, textAlignVertical: "top" }]}
                multiline
              />
            </>
          )}

          {/* Due Date */}
          <Text style={labelStyle}>Due Date</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={[
                inputStyle,
                {
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                },
              ]}
            >
              <Text style={{ color: dueDate ? "#111" : "#9ca3af" }}>
                {dueDate ?? "No date"}
              </Text>
              <Feather name="calendar" size={18} color="#6b7280" />
            </TouchableOpacity>
            {dueDate && (
              <TouchableOpacity onPress={clearDate} style={{ padding: 8 }}>
                <Feather name="x" size={18} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={dueDate ? new Date(dueDate + "T00:00:00") : new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              onChange={handleDateChange}
            />
          )}

          {/* Due Time */}
          <Text style={labelStyle}>Due Time</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <TouchableOpacity
              onPress={() => setShowTimePicker(true)}
              style={[
                inputStyle,
                {
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                },
              ]}
            >
              <Text style={{ color: dueTime ? "#111" : "#9ca3af" }}>
                {dueTime ?? "No time"}
              </Text>
              <Feather name="clock" size={18} color="#6b7280" />
            </TouchableOpacity>
            {dueTime && (
              <TouchableOpacity onPress={clearTime} style={{ padding: 8 }}>
                <Feather name="x" size={18} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>

          {showTimePicker && (
            <DateTimePicker
              value={
                dueTime
                  ? (() => {
                      const [h, m] = dueTime.split(":").map(Number);
                      const d = new Date();
                      d.setHours(h, m, 0, 0);
                      return d;
                    })()
                  : new Date()
              }
              mode="time"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleTimeChange}
            />
          )}

          {/* Parent Pickers (cascading dropdowns) */}
          {showGoalPicker && filtered.goals.length > 0 && (
            <DropdownPicker
              label="Goal"
              iconElement={<EntityIcon type="goal" color={modeColor} size={14} />}
              options={filtered.goals}
              selectedId={goalId}
              onChange={handleGoalChange}
              modeColor={modeColor}
            />
          )}

          {showParentProjectPicker && filtered.projects.length > 0 && (
            <DropdownPicker
              label="Parent Project"
              iconElement={<EntityIcon type="project" color={modeColor} size={14} />}
              options={filtered.projects}
              selectedId={parentProjectId}
              onChange={handleProjectChange}
              modeColor={modeColor}
            />
          )}

          {showProjectPicker && filtered.projects.length > 0 && (
            <DropdownPicker
              label="Project"
              iconElement={<EntityIcon type="project" color={modeColor} size={14} />}
              options={filtered.projects}
              selectedId={projectId}
              onChange={handleProjectChange}
              modeColor={modeColor}
            />
          )}

          {showParentMilestonePicker && filtered.milestones.length > 0 && (
            <DropdownPicker
              label="Parent Milestone"
              iconElement={<EntityIcon type="milestone" color={modeColor} size={14} />}
              options={filtered.milestones}
              selectedId={parentMilestoneId}
              onChange={handleMilestoneChange}
              modeColor={modeColor}
            />
          )}

          {showMilestonePicker && filtered.milestones.length > 0 && (
            <DropdownPicker
              label="Milestone"
              iconElement={<EntityIcon type="milestone" color={modeColor} size={14} />}
              options={filtered.milestones}
              selectedId={milestoneId}
              onChange={handleMilestoneChange}
              modeColor={modeColor}
            />
          )}

          {/* Assignee */}
          <AssigneePicker
            modeId={defaultModeId}
            selectedId={assignedToId}
            onChange={setAssignedToId}
          />

          {/* Delete Button (edit mode only) */}
          {isEdit && (
            <TouchableOpacity
              onPress={handleDelete}
              style={{
                marginTop: 32,
                paddingVertical: 14,
                borderRadius: 10,
                backgroundColor: "#fee2e2",
                alignItems: "center",
              }}
            >
              <Text
                style={{ color: "#dc2626", fontWeight: "600", fontSize: 16 }}
              >
                Delete {LABELS[entityType]}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        )}
      </KeyboardAvoidingView>
      </SafeAreaView>
      </View>
    </Modal>
  );
}

// ── Shared styles ──────────────────────────────────────────

const labelStyle = {
  fontSize: 13 as const,
  fontWeight: "600" as const,
  color: "#374151",
  marginBottom: 6,
  marginTop: 16,
};

const inputStyle = {
  borderWidth: 1,
  borderColor: "#d1d5db",
  borderRadius: 10,
  padding: 12,
  fontSize: 16 as const,
  backgroundColor: "#fff",
};
