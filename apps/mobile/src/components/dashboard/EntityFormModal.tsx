import React, { useState, useEffect, useMemo } from "react";
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
import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
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
import type { Goal } from "@shared/types/Goal";
import type { Project } from "@shared/types/Project";
import type { Milestone } from "@shared/types/Milestone";
import type { Task } from "@shared/types/Task";
import type { EntityFormType } from "../../lib/store/useEntityFormStore";
import CommentsTab from "./CommentsTab";
import NotesTab from "./NotesTab";
import AssigneePicker from "../collaboration/AssigneePicker";

type ActiveTab = "details" | "comments" | "notes";

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
  const isEdit = !!editEntity;
  const [activeTab, setActiveTab] = useState<ActiveTab>("details");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [goalId, setGoalId] = useState<number | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [milestoneId, setMilestoneId] = useState<number | null>(null);
  const [assignedToId, setAssignedToId] = useState<number | null>(null);

  // Parent pickers — read from stores
  const goals = useGoalStore((s) => s.goals);
  const projects = useProjectStore((s) => s.projects);
  const milestones = useMilestoneStore((s) => s.milestones);

  // Filter parents by current mode
  const modeGoals = useMemo(
    () => goals.filter((g) => g.modeId === defaultModeId),
    [goals, defaultModeId]
  );
  const modeProjects = useMemo(
    () => projects.filter((p) => p.modeId === defaultModeId),
    [projects, defaultModeId]
  );
  const modeMilestones = useMemo(
    () => milestones.filter((m) => m.modeId === defaultModeId),
    [milestones, defaultModeId]
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

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setActiveTab("details");
      if (editEntity) {
        setTitle(editEntity.title);
        setDueDate(editEntity.dueDate ?? null);
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
        setAssignedToId((editEntity as any).assignedToId ?? null);
      } else {
        setTitle("");
        setDescription("");
        setDueDate(null);
        setGoalId(null);
        setProjectId(null);
        setMilestoneId(null);
        setAssignedToId(null);
      }
    }
  }, [visible, editEntity]);

  const handleSubmit = async () => {
    if (!title.trim()) return;

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
              assignedToId,
            });
            break;
          case "project":
            await updateProject.mutateAsync({
              id: editEntity!.id,
              title: title.trim(),
              description: description || null,
              dueDate: dueDate,
              goalId,
              assignedToId,
            });
            break;
          case "milestone":
            await updateMilestone.mutateAsync({
              id: editEntity!.id,
              title: title.trim(),
              dueDate: dueDate,
              goalId,
              projectId,
              assignedToId,
            });
            break;
          case "task":
            await updateTask.mutateAsync({
              id: editEntity!.id,
              title: title.trim(),
              dueDate: dueDate,
              milestoneId,
              projectId,
              goalId,
              assignedToId,
            });
            break;
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
              assignedToId,
            });
            break;
          case "project":
            await createProject.mutateAsync({
              title: title.trim(),
              modeId: defaultModeId,
              description: description || undefined,
              dueDate: dueDate,
              goalId,
              assignedToId,
            });
            break;
          case "milestone":
            await createMilestone.mutateAsync({
              title: title.trim(),
              modeId: defaultModeId,
              dueDate: dueDate,
              goalId,
              projectId,
              assignedToId,
            });
            break;
          case "task":
            await createTask.mutateAsync({
              title: title.trim(),
              modeId: defaultModeId,
              dueDate: dueDate,
              milestoneId,
              projectId,
              goalId,
              assignedToId,
            });
            break;
        }
      }
      onClose();
    } catch {
      // Mutation error handled by React Query
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

  const clearDate = () => {
    setDueDate(null);
    setShowDatePicker(false);
  };

  const showDescription = entityType === "goal" || entityType === "project";
  const showGoalPicker = entityType !== "goal";
  const showProjectPicker =
    entityType === "milestone" || entityType === "task";
  const showMilestonePicker = entityType === "task";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: "#fff" }}
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
            disabled={isPending || !title.trim()}
          >
            {isPending ? (
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

        {/* Tab bar — only in edit mode */}
        {isEdit && (
          <View
            style={{
              flexDirection: "row",
              borderBottomWidth: 1,
              borderBottomColor: "#e5e7eb",
            }}
          >
            {(["details", "comments", "notes"] as ActiveTab[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderBottomWidth: 2,
                  borderBottomColor:
                    activeTab === tab ? "#2563eb" : "transparent",
                }}
              >
                <Text
                  style={{
                    textAlign: "center",
                    fontSize: 14,
                    fontWeight: activeTab === tab ? "600" : "400",
                    color: activeTab === tab ? "#2563eb" : "#6b7280",
                  }}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
          />
        )}

        {/* Details tab (or create form) */}
        {(activeTab === "details" || !isEdit) && (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
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

          {/* Parent Pickers */}
          {showGoalPicker && modeGoals.length > 0 && (
            <>
              <Text style={labelStyle}>Goal</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 12 }}
              >
                <TouchableOpacity
                  onPress={() => setGoalId(null)}
                  style={[chipStyle, !goalId && chipActiveStyle]}
                >
                  <Text
                    style={[chipText, !goalId && chipActiveText]}
                  >
                    None
                  </Text>
                </TouchableOpacity>
                {modeGoals.map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    onPress={() => setGoalId(g.id)}
                    style={[chipStyle, goalId === g.id && chipActiveStyle]}
                  >
                    <Text
                      style={[chipText, goalId === g.id && chipActiveText]}
                    >
                      {g.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {showProjectPicker && modeProjects.length > 0 && (
            <>
              <Text style={labelStyle}>Project</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 12 }}
              >
                <TouchableOpacity
                  onPress={() => setProjectId(null)}
                  style={[chipStyle, !projectId && chipActiveStyle]}
                >
                  <Text
                    style={[chipText, !projectId && chipActiveText]}
                  >
                    None
                  </Text>
                </TouchableOpacity>
                {modeProjects.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setProjectId(p.id)}
                    style={[chipStyle, projectId === p.id && chipActiveStyle]}
                  >
                    <Text
                      style={[chipText, projectId === p.id && chipActiveText]}
                    >
                      {p.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {showMilestonePicker && modeMilestones.length > 0 && (
            <>
              <Text style={labelStyle}>Milestone</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 12 }}
              >
                <TouchableOpacity
                  onPress={() => setMilestoneId(null)}
                  style={[chipStyle, !milestoneId && chipActiveStyle]}
                >
                  <Text
                    style={[chipText, !milestoneId && chipActiveText]}
                  >
                    None
                  </Text>
                </TouchableOpacity>
                {modeMilestones.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => setMilestoneId(m.id)}
                    style={[chipStyle, milestoneId === m.id && chipActiveStyle]}
                  >
                    <Text
                      style={[
                        chipText,
                        milestoneId === m.id && chipActiveText,
                      ]}
                    >
                      {m.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
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

const chipStyle = {
  paddingHorizontal: 14,
  paddingVertical: 8,
  borderRadius: 20,
  backgroundColor: "#f3f4f6",
  marginRight: 8,
  borderWidth: 1,
  borderColor: "#e5e7eb",
};

const chipActiveStyle = {
  backgroundColor: "#1d4ed8",
  borderColor: "#1d4ed8",
};

const chipText = {
  fontSize: 14 as const,
  color: "#374151",
};

const chipActiveText = {
  color: "#fff",
};
