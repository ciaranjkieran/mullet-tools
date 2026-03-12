import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useWhiteNavBar } from "../../lib/hooks/useWhiteNavBar";
import { Feather } from "@expo/vector-icons";
import EntityIcon from "../EntityIcon";
import DropdownPicker from "../dashboard/DropdownPicker";
import MilestoneEditorMobile from "./MilestoneEditorMobile";
import ProjectEditorMobile from "./ProjectEditorMobile";
import type { Mode } from "@shared/types/Mode";
import type {
  TemplateMilestoneData,
  TemplateProjectData,
} from "@shared/types/Template";
import { useCreateTemplate } from "@shared/api/hooks/templates/useCreateTemplate";

type TemplateType = "milestone" | "project";

type Props = {
  visible: boolean;
  onClose: () => void;
  modes: Mode[];
  /** Pre-selected type tab */
  initialType?: TemplateType;
  /** Prefill from existing entity or workbench draft */
  prefillMilestone?: TemplateMilestoneData;
  prefillProject?: TemplateProjectData;
  prefillModeId?: number;
};

const EMPTY_MILESTONE: TemplateMilestoneData = {
  title: "",
  tasks: [],
  subMilestones: [],
};

const EMPTY_PROJECT: TemplateProjectData = {
  title: "",
  tasks: [],
  subProjects: [],
  subMilestones: [],
};

export default function BuildTemplateModal({
  visible,
  onClose,
  modes,
  initialType = "milestone",
  prefillMilestone,
  prefillProject,
  prefillModeId,
}: Props) {
  useWhiteNavBar(visible);
  const createTemplate = useCreateTemplate();

  const [type, setType] = useState<TemplateType>(initialType);
  const [modeId, setModeId] = useState<number>(
    prefillModeId ?? modes[0]?.id ?? 0
  );
  const [milestone, setMilestone] =
    useState<TemplateMilestoneData>(EMPTY_MILESTONE);
  const [project, setProject] = useState<TemplateProjectData>(EMPTY_PROJECT);
  const [saving, setSaving] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (!visible) return;
    setType(prefillProject ? "project" : prefillMilestone ? "milestone" : initialType);
    setModeId(prefillModeId ?? modes[0]?.id ?? 0);
    setMilestone(prefillMilestone ?? EMPTY_MILESTONE);
    setProject(prefillProject ?? EMPTY_PROJECT);
    setSaving(false);
  }, [visible, prefillMilestone, prefillProject, prefillModeId, initialType, modes]);

  const insets = useSafeAreaInsets();
  const modeColor = useMemo(
    () => modes.find((m) => m.id === modeId)?.color ?? "#000",
    [modes, modeId]
  );

  const title = type === "milestone" ? milestone.title : project.title;

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Title required", "Please enter a template title.");
      return;
    }
    setSaving(true);
    try {
      const input =
        type === "milestone"
          ? { title: title.trim(), type: "milestone" as const, mode: modeId, data: milestone }
          : { title: title.trim(), type: "project" as const, mode: modeId, data: project };
      await createTemplate.mutateAsync(input);
      onClose();
    } catch {
      Alert.alert("Error", "Failed to create template.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "#fff" }}
        edges={["top", "bottom"]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#e5e7eb",
            }}
          >
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Feather name="x" size={22} color="#6b7280" />
            </TouchableOpacity>
            <Text
              style={{
                flex: 1,
                textAlign: "center",
                fontSize: 17,
                fontWeight: "600",
              }}
            >
              New Template
            </Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={{
                backgroundColor: modeColor,
                paddingHorizontal: 16,
                paddingVertical: 7,
                borderRadius: 8,
                opacity: saving ? 0.6 : 1,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>
                {saving ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Color strip */}
          <View style={{ height: 3, backgroundColor: modeColor }} />

          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Type toggle */}
            <View
              style={{
                flexDirection: "row",
                backgroundColor: "#f3f4f6",
                borderRadius: 10,
                padding: 3,
                marginBottom: 16,
              }}
            >
              {(["milestone", "project"] as TemplateType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setType(t)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: type === t ? "#fff" : "transparent",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: type === t ? "600" : "400",
                      color: type === t ? "#111" : "#6b7280",
                    }}
                  >
                    {t === "milestone" ? "Milestone" : "Project"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Title */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <EntityIcon
                type={type}
                size={24}
                color={modeColor}
              />
              <TextInput
                value={title}
                onChangeText={(v) => {
                  if (type === "milestone") {
                    setMilestone({ ...milestone, title: v });
                  } else {
                    setProject({ ...project, title: v });
                  }
                }}
                placeholder={
                  type === "milestone"
                    ? "Milestone template title"
                    : "Project template title"
                }
                placeholderTextColor="#9ca3af"
                style={{
                  flex: 1,
                  fontSize: 20,
                  fontWeight: "700",
                  color: "#111",
                  padding: 0,
                }}
              />
            </View>

            {/* Mode picker */}
            {modes.length > 1 && (
              <View style={{ marginBottom: 20 }}>
                <DropdownPicker
                  label="Mode"
                  icon="target"
                  modeColor={modeColor}
                  options={modes.map((m) => ({ id: m.id, title: m.title }))}
                  selectedId={modeId}
                  onChange={(id) => { if (id !== null) setModeId(id); }}
                  preserveOrder
                />
              </View>
            )}

            {/* Editor */}
            {type === "milestone" ? (
              <MilestoneEditorMobile
                node={milestone}
                onChange={setMilestone}
                modeColor={modeColor}
              />
            ) : (
              <ProjectEditorMobile
                node={project}
                onChange={setProject}
                modeColor={modeColor}
              />
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
