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
  Template,
  TemplateMilestoneData,
  TemplateProjectData,
} from "@shared/types/Template";
import { usePatchTemplate } from "@shared/api/hooks/templates/usePatchTemplate";

type Props = {
  visible: boolean;
  onClose: () => void;
  template: Template | null;
  modes: Mode[];
};

export default function EditTemplateModal({
  visible,
  onClose,
  template,
  modes,
}: Props) {
  useWhiteNavBar(visible);
  const patchTemplate = usePatchTemplate();

  const [modeId, setModeId] = useState<number>(0);
  const [milestoneNode, setMilestoneNode] = useState<TemplateMilestoneData>({
    title: "",
    tasks: [],
    subMilestones: [],
  });
  const [projectNode, setProjectNode] = useState<TemplateProjectData>({
    title: "",
    tasks: [],
    subProjects: [],
    subMilestones: [],
  });
  const [saving, setSaving] = useState(false);

  const type = template?.type ?? "milestone";

  // Sync state when template changes
  useEffect(() => {
    if (!visible || !template) return;

    setModeId(template.mode ?? modes[0]?.id ?? 0);

    if (template.type === "milestone") {
      const data = template.data as TemplateMilestoneData;
      setMilestoneNode({
        title: template.title || "",
        tasks: data.tasks ?? [],
        subMilestones: data.subMilestones ?? [],
      });
    } else {
      const data = template.data as TemplateProjectData;
      setProjectNode({
        title: template.title || "",
        tasks: data.tasks ?? [],
        subProjects: data.subProjects ?? [],
        subMilestones: data.subMilestones ?? [],
      });
    }

    setSaving(false);
  }, [visible, template, modes]);

  const insets = useSafeAreaInsets();
  const modeColor = useMemo(
    () => modes.find((m) => m.id === modeId)?.color ?? "#000",
    [modes, modeId]
  );

  const node = type === "milestone" ? milestoneNode : projectNode;
  const title = node.title;

  const handleSave = async () => {
    if (!template) return;
    if (!title.trim()) {
      Alert.alert("Title required", "Please enter a template title.");
      return;
    }
    setSaving(true);
    try {
      await patchTemplate.mutateAsync({
        id: template.id,
        updates: {
          title: title.trim(),
          mode: modeId,
          data: type === "milestone" ? milestoneNode : projectNode,
        },
      });
      onClose();
    } catch {
      Alert.alert("Error", "Failed to save template.");
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
              Edit Template
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
            {/* Title */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <EntityIcon type={type} size={24} color={modeColor} />
              <TextInput
                value={title}
                onChangeText={(v) => {
                  if (type === "milestone") {
                    setMilestoneNode({ ...milestoneNode, title: v });
                  } else {
                    setProjectNode({ ...projectNode, title: v });
                  }
                }}
                placeholder="Template title"
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
                node={milestoneNode}
                onChange={setMilestoneNode}
                modeColor={modeColor}
              />
            ) : (
              <ProjectEditorMobile
                node={projectNode}
                onChange={setProjectNode}
                modeColor={modeColor}
              />
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
