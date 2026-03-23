import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useWhiteNavBar } from "../../lib/hooks/useWhiteNavBar";
import { textLine } from "../../lib/styles/platform";
import { useSelectionStore } from "../../lib/store/useSelectionStore";
import { useModeStore } from "@shared/store/useModeStore";
import { useGoalStore } from "@shared/store/useGoalStore";
import { useProjectStore } from "@shared/store/useProjectStore";
import { useMilestoneStore } from "@shared/store/useMilestoneStore";
import { useTaskStore } from "@shared/store/useTaskStore";
import { useBatchApply } from "@shared/api/batch/hooks/useBatchApply";
import { getContrastingText } from "@shared/utils/getContrastingText";
import { computeParentOptions } from "@shared/batch/parentingUtils";
import type { EntityKind } from "@shared/api/batch/types/types";
import DropdownPicker from "../dashboard/DropdownPicker";
import EntityIcon from "../EntityIcon";
import type { Mode } from "@shared/types/Mode";

type Props = {
  visible: boolean;
  onClose: () => void;
};

const formatDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const formatTime = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

const formatDateDisplay = (d: Date) =>
  d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

export default function BatchEditorModal({ visible, onClose }: Props) {
  useWhiteNavBar(visible);

  const selected = useSelectionStore((s) => s.selected);
  const totalCount = useSelectionStore((s) => s.totalCount());
  const clearAll = useSelectionStore((s) => s.clearAll);
  const countByType = useMemo(() => ({
    goal: selected.goal?.size ?? 0,
    project: selected.project?.size ?? 0,
    milestone: selected.milestone?.size ?? 0,
    task: selected.task?.size ?? 0,
  }), [selected]);

  const modes = useModeStore((s) => (s as any).modes as Mode[] | undefined) ?? [];
  const goals = useGoalStore((s) => s.goals);
  const projects = useProjectStore((s) => s.projects);
  const milestones = useMilestoneStore((s) => s.milestones);
  const tasks = useTaskStore((s) => s.tasks);
  const { apply, isApplying } = useBatchApply();

  // --- State ---
  const [targetModeId, setTargetModeId] = useState<number | null>(null);
  const [setToday, setSetToday] = useState(false);
  const [clearDueDate, setClearDueDate] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [markComplete, setMarkComplete] = useState(false);
  const [doDelete, setDoDelete] = useState(false);
  const [selGoalId, setSelGoalId] = useState<number | null>(null);
  const [selProjectId, setSelProjectId] = useState<number | null>(null);
  const [selMilestoneId, setSelMilestoneId] = useState<number | null>(null);

  // Date/time picker visibility
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // --- Determine if all selected items share the same mode ---
  const kinds = useMemo<EntityKind[]>(() => {
    const out: EntityKind[] = [];
    if (selected.task?.size) out.push("task");
    if (selected.milestone?.size) out.push("milestone");
    if (selected.project?.size) out.push("project");
    if (selected.goal?.size) out.push("goal");
    return out;
  }, [selected]);

  const { sameMode, onlyModeId } = useMemo(() => {
    const ids = new Set<number>();
    const addMode = (modeId?: number | null) => {
      if (typeof modeId === "number") ids.add(modeId);
    };
    selected.task?.forEach((id: number) => {
      const t = tasks.find((x) => x.id === id);
      addMode((t as any)?.modeId);
    });
    selected.milestone?.forEach((id: number) => {
      const m = milestones.find((x) => x.id === id);
      addMode((m as any)?.modeId);
    });
    selected.project?.forEach((id: number) => {
      const p = projects.find((x) => x.id === id);
      addMode((p as any)?.modeId);
    });
    selected.goal?.forEach((id: number) => {
      const g = goals.find((x) => x.id === id);
      addMode((g as any)?.modeId);
    });
    const same = ids.size === 1;
    return { sameMode: same, onlyModeId: same ? [...ids][0] : null as number | null };
  }, [selected, tasks, milestones, projects, goals]);

  const effectiveModeId = targetModeId ?? onlyModeId ?? modes[0]?.id ?? null;

  const modeColor = (effectiveModeId && modes.find((m) => m.id === effectiveModeId)?.color) ?? "#333";
  const applyFg = getContrastingText(modeColor);

  // --- Group under: filter entities by effective mode ---
  const goalsInMode = useMemo(
    () => goals.filter((g) => (g as any).modeId === effectiveModeId),
    [goals, effectiveModeId],
  );
  const projectsInMode = useMemo(
    () => projects.filter((p) => (p as any).modeId === effectiveModeId),
    [projects, effectiveModeId],
  );
  const milestonesInMode = useMemo(
    () => milestones.filter((m) => (m as any).modeId === effectiveModeId),
    [milestones, effectiveModeId],
  );

  const { parentOptions, groupingReason } = useMemo(
    () => computeParentOptions({
      kinds,
      selected,
      sameMode: sameMode || targetModeId != null,
      milestonesInMode,
      projectsInMode,
      goalsInMode,
    }),
    [kinds, selected, sameMode, targetModeId, milestonesInMode, projectsInMode, goalsInMode],
  );

  const selectionIncludesGoal = kinds.includes("goal");
  const groupingEnabled =
    (sameMode || targetModeId != null) &&
    effectiveModeId != null &&
    parentOptions.length > 0 &&
    !selectionIncludesGoal;

  // Split parent options into per-type lists for dropdowns
  const goalOptions = useMemo(
    () => parentOptions.filter((p) => p.type === "goal").map((p) => ({ id: p.id, title: p.title })),
    [parentOptions],
  );
  const projectOptions = useMemo(
    () => parentOptions.filter((p) => p.type === "project").map((p) => ({ id: p.id, title: p.title })),
    [parentOptions],
  );
  const milestoneOptions = useMemo(
    () => parentOptions.filter((p) => p.type === "milestone").map((p) => ({ id: p.id, title: p.title })),
    [parentOptions],
  );

  // Derive targetParent from the most specific selection
  const targetParent = useMemo(() => {
    if (selMilestoneId != null) {
      const m = milestonesInMode.find((x) => x.id === selMilestoneId);
      return m ? { id: m.id, type: "milestone" as const, title: m.title } : null;
    }
    if (selProjectId != null) {
      const p = projectsInMode.find((x) => x.id === selProjectId);
      return p ? { id: p.id, type: "project" as const, title: p.title } : null;
    }
    if (selGoalId != null) {
      const g = goalsInMode.find((x) => x.id === selGoalId);
      return g ? { id: g.id, type: "goal" as const, title: g.title } : null;
    }
    return null;
  }, [selGoalId, selProjectId, selMilestoneId, goalsInMode, projectsInMode, milestonesInMode]);

  // Pre-select the mode when all selected items share the same mode
  useEffect(() => {
    if (visible && onlyModeId != null) {
      setTargetModeId(onlyModeId);
    }
  }, [visible, onlyModeId]);

  // Reset parent selection when mode changes
  useEffect(() => {
    setSelGoalId(null);
    setSelProjectId(null);
    setSelMilestoneId(null);
  }, [effectiveModeId]);

  const resetForm = () => {
    setTargetModeId(null);
    setSetToday(false);
    setClearDueDate(false);
    setDueDate("");
    setDueTime("");
    setMarkComplete(false);
    setDoDelete(false);
    setSelGoalId(null);
    setSelProjectId(null);
    setSelMilestoneId(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const hasChanges =
    targetModeId !== null ||
    targetParent !== null ||
    setToday ||
    clearDueDate ||
    !!dueDate ||
    !!dueTime ||
    markComplete ||
    doDelete;

  const handleApply = async () => {
    if (doDelete) {
      Alert.alert(
        "Delete Items",
        `This will permanently delete ${totalCount} item${totalCount !== 1 ? "s" : ""}. This cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => runApply(),
          },
        ]
      );
      return;
    }
    if (markComplete) {
      Alert.alert(
        "Complete Items",
        `Mark ${totalCount} item${totalCount !== 1 ? "s" : ""} as complete? This cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Complete", onPress: () => runApply() },
        ]
      );
      return;
    }
    await runApply();
  };

  const runApply = async () => {
    try {
      await apply({
        selected,
        targetModeId,
        targetParent,
        setToday,
        dueDate,
        dueTime,
        clearDueDate,
        markComplete,
        doDelete,
      });
      clearAll();
      handleClose();
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };

  // --- Schedule state helpers ---
  const handleSetToday = () => {
    if (markComplete || doDelete) return;
    setSetToday(!setToday);
    if (!setToday) {
      setClearDueDate(false);
      setDueDate("");
    }
  };

  const handleClearDate = () => {
    if (markComplete || doDelete) return;
    setClearDueDate(!clearDueDate);
    if (!clearDueDate) {
      setSetToday(false);
      setDueDate("");
      setDueTime("");
    }
  };

  const handleDateChange = (_event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (date) {
      setDueDate(formatDate(date));
      setSetToday(false);
      setClearDueDate(false);
    }
  };

  const handleTimeChange = (_event: any, date?: Date) => {
    setShowTimePicker(Platform.OS === "ios");
    if (date) {
      setDueTime(formatTime(date));
      setClearDueDate(false);
    }
  };

  // --- Summary line ---
  const summaryParts: string[] = [];
  if (countByType.task > 0)
    summaryParts.push(`${countByType.task} task${countByType.task !== 1 ? "s" : ""}`);
  if (countByType.milestone > 0)
    summaryParts.push(`${countByType.milestone} milestone${countByType.milestone !== 1 ? "s" : ""}`);
  if (countByType.project > 0)
    summaryParts.push(`${countByType.project} project${countByType.project !== 1 ? "s" : ""}`);
  if (countByType.goal > 0)
    summaryParts.push(`${countByType.goal} goal${countByType.goal !== 1 ? "s" : ""}`);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        {/* Mode color bar at top */}
        <View
          style={{
            height: 6,
            backgroundColor: effectiveModeId ? modeColor : "#e5e7eb",
          }}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#e5e7eb",
            }}
          >
            <TouchableOpacity onPress={handleClose} disabled={isApplying}>
              <Text style={{ ...textLine(16), color: "#6b7280" }}>Cancel</Text>
            </TouchableOpacity>

            <View style={{ alignItems: "center" }}>
              <Text style={{ ...textLine(17), fontWeight: "700", color: "#111" }}>
                Batch Edit
              </Text>
              <Text style={{ ...textLine(13), color: "#6b7280" }}>
                {totalCount} Selected
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleApply}
              disabled={isApplying || !hasChanges}
              style={{
                backgroundColor: hasChanges ? modeColor : "#d1d5db",
                paddingHorizontal: 16,
                paddingVertical: 6,
                borderRadius: 8,
                opacity: isApplying ? 0.6 : 1,
              }}
            >
              {isApplying ? (
                <ActivityIndicator size="small" color={applyFg} />
              ) : (
                <Text
                  style={{
                    ...textLine(15),
                    fontWeight: "600",
                    color: hasChanges ? applyFg : "#fff",
                  }}
                >
                  Apply
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          >
            {/* Selection summary */}
            <Text
              style={{
                ...textLine(14),
                color: "#6b7280",
                marginBottom: 20,
              }}
            >
              {summaryParts.join(", ")} selected
            </Text>

            {/* ─── Mode ─── */}
            <DropdownPicker
              label="Mode"
              options={modes.map((m) => ({ id: m.id, title: m.title }))}
              selectedId={targetModeId}
              onChange={(id) => setTargetModeId(id)}
              modeColor={effectiveModeId ? modeColor : undefined}
              preserveOrder
            />

            <View style={{ height: 24 }} />

            {/* ─── Group under ─── */}
            <View style={{ marginBottom: 24 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <Text style={{ ...textLine(15), fontWeight: "600", color: "#111" }}>
                  Group under
                </Text>
                {!groupingEnabled && (
                  <Text style={{ ...textLine(12), color: "#6b7280" }}>
                    {selectionIncludesGoal
                      ? "Goals can't have parents"
                      : groupingReason || "Requires single-mode selection"}
                  </Text>
                )}
              </View>

              {groupingEnabled && goalOptions.length === 0 && projectOptions.length === 0 && milestoneOptions.length === 0 && (
                <Text style={{ ...textLine(13), color: "#6b7280" }}>
                  No eligible parents in this mode.
                </Text>
              )}

              {groupingEnabled && goalOptions.length > 0 && (
                <DropdownPicker
                  label="Goal"
                  iconElement={<EntityIcon type="goal" color={modeColor} size={14} />}
                  options={goalOptions}
                  selectedId={selGoalId}
                  onChange={(id) => {
                    setSelGoalId(id);
                    setSelProjectId(null);
                    setSelMilestoneId(null);
                  }}
                  modeColor={modeColor}
                />
              )}

              {groupingEnabled && projectOptions.length > 0 && (
                <DropdownPicker
                  label="Project"
                  iconElement={<EntityIcon type="project" color={modeColor} size={14} />}
                  options={projectOptions}
                  selectedId={selProjectId}
                  onChange={(id) => {
                    setSelProjectId(id);
                    setSelMilestoneId(null);
                  }}
                  modeColor={modeColor}
                />
              )}

              {groupingEnabled && milestoneOptions.length > 0 && (
                <DropdownPicker
                  label="Milestone"
                  iconElement={<EntityIcon type="milestone" color={modeColor} size={14} />}
                  options={milestoneOptions}
                  selectedId={selMilestoneId}
                  onChange={setSelMilestoneId}
                  modeColor={modeColor}
                />
              )}

              {groupingEnabled && (selGoalId || selProjectId || selMilestoneId) && (
                <TouchableOpacity
                  onPress={() => {
                    setSelGoalId(null);
                    setSelProjectId(null);
                    setSelMilestoneId(null);
                  }}
                  style={{ marginTop: 8 }}
                >
                  <Text style={{ ...textLine(12), color: "#6b7280", textDecorationLine: "underline" }}>
                    Clear parent selection
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* ─── Schedule ─── */}
            <SectionHeader title="Schedule" />
            <View style={{ gap: 10, marginBottom: 24 }}>
              {/* Set to Today + Clear due date row */}
              <View style={{ flexDirection: "row", gap: 16 }}>
                <CheckboxRow
                  label="Set to Today"
                  checked={setToday}
                  onToggle={handleSetToday}
                  disabled={isApplying || clearDueDate}
                  color="#1e40af"
                />
                <CheckboxRow
                  label="Clear due date"
                  checked={clearDueDate}
                  onToggle={handleClearDate}
                  disabled={isApplying}
                  color="#374151"
                />
              </View>

              {/* Pick date */}
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                disabled={isApplying || clearDueDate}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#d1d5db",
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 8,
                  gap: 8,
                  opacity: clearDueDate ? 0.4 : 1,
                }}
              >
                <Text style={{ ...textLine(13), color: "#6b7280" }}>Due date</Text>
                <Text style={{ ...textLine(14), color: dueDate ? "#111" : "#9ca3af", flex: 1 }}>
                  {dueDate
                    ? formatDateDisplay(new Date(dueDate + "T00:00:00"))
                    : "—"}
                </Text>
                {dueDate ? (
                  <TouchableOpacity
                    onPress={() => setDueDate("")}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="x" size={16} color="#9ca3af" />
                  </TouchableOpacity>
                ) : null}
              </TouchableOpacity>

              {/* Pick time */}
              <TouchableOpacity
                onPress={() => setShowTimePicker(true)}
                disabled={isApplying || clearDueDate}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#d1d5db",
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 8,
                  gap: 8,
                  opacity: clearDueDate ? 0.4 : 1,
                }}
              >
                <Text style={{ ...textLine(13), color: "#6b7280" }}>Due time</Text>
                <Text style={{ ...textLine(14), color: dueTime ? "#111" : "#9ca3af", flex: 1 }}>
                  {dueTime || "—"}
                </Text>
                {dueTime ? (
                  <TouchableOpacity
                    onPress={() => setDueTime("")}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="x" size={16} color="#9ca3af" />
                  </TouchableOpacity>
                ) : null}
              </TouchableOpacity>
            </View>

            {/* ─── Bulk Actions ─── */}
            <SectionHeader title="Bulk actions" />
            <View style={{ gap: 12 }}>
              <CheckboxRow
                label="Mark all as complete (irreversible)"
                checked={markComplete}
                onToggle={() => {
                  setMarkComplete(!markComplete);
                  if (!markComplete) {
                    setDoDelete(false);
                    setSetToday(false);
                  }
                }}
                disabled={isApplying}
                color="#166534"
              />

              <CheckboxRow
                label="Delete all (irreversible)"
                checked={doDelete}
                onToggle={() => {
                  setDoDelete(!doDelete);
                  if (!doDelete) {
                    setMarkComplete(false);
                    setSetToday(false);
                  }
                }}
                disabled={isApplying}
                color="#b91c1c"
              />
            </View>
          </ScrollView>

          {/* Date/time pickers */}
          {showDatePicker && (
            <DateTimePicker
              value={dueDate ? new Date(dueDate + "T00:00:00") : new Date()}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={
                dueTime
                  ? (() => {
                      const d = new Date();
                      const [h, m] = dueTime.split(":").map(Number);
                      d.setHours(h, m, 0, 0);
                      return d;
                    })()
                  : new Date()
              }
              mode="time"
              display="default"
              onChange={handleTimeChange}
            />
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Reusable sub-components ───

function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      style={{
        ...textLine(15),
        fontWeight: "600",
        color: "#111",
        marginBottom: 10,
      }}
    >
      {title}
    </Text>
  );
}

function CheckboxRow({
  label,
  checked,
  onToggle,
  disabled,
  color = "#374151",
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
  color?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      disabled={disabled}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 4,
      }}
    >
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 4,
          borderWidth: 1.5,
          borderColor: checked ? color : "#d1d5db",
          backgroundColor: checked ? color : "#fff",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {checked && <Feather name="check" size={12} color="#fff" />}
      </View>
      <Text
        style={{
          ...textLine(14),
          fontWeight: "600",
          color,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
