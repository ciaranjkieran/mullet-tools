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
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useWhiteNavBar } from "../../lib/hooks/useWhiteNavBar";
import { Feather } from "@expo/vector-icons";
import EntityIcon from "../EntityIcon";
import MilestoneEditorMobile from "./MilestoneEditorMobile";
import ProjectEditorMobile from "./ProjectEditorMobile";
import type { Mode } from "@shared/types/Mode";
import type {
  Template,
  TemplateMilestoneData,
  TemplateProjectData,
} from "@shared/types/Template";
import useApplyTemplate from "@shared/api/hooks/templates/useApplyTemplate";

type Props = {
  visible: boolean;
  onClose: () => void;
  template: Template | null;
  modes: Mode[];
};

export default function UseTemplateModal({
  visible,
  onClose,
  template,
  modes,
}: Props) {
  useWhiteNavBar(visible);
  const insets = useSafeAreaInsets();
  const { applyTemplate } = useApplyTemplate();

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
  const [submitting, setSubmitting] = useState(false);

  const type = template?.type ?? "milestone";

  // Sync state when template changes
  useEffect(() => {
    if (!visible || !template) return;

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

    setSubmitting(false);
  }, [visible, template]);

  const modeColor = useMemo(
    () =>
      template
        ? modes.find((m) => m.id === template.mode)?.color ?? "#000"
        : "#000",
    [template, modes]
  );

  const node = type === "milestone" ? milestoneNode : projectNode;
  const title = node.title;

  const handleCreate = async () => {
    if (!template || submitting) return;
    if (!title.trim()) {
      Alert.alert("Title required", "Please enter a title.");
      return;
    }

    setSubmitting(true);
    try {
      const customTemplate = {
        ...template,
        title: title.trim(),
        data: type === "milestone" ? milestoneNode : projectNode,
      } as Template;
      await applyTemplate(customTemplate);
      Alert.alert("Success", `"${title.trim()}" created!`);
      onClose();
    } catch {
      Alert.alert("Error", "Failed to create from template.");
    } finally {
      setSubmitting(false);
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
              Use Template
            </Text>
            <TouchableOpacity
              onPress={handleCreate}
              disabled={submitting || !title.trim()}
              style={{
                backgroundColor: modeColor,
                paddingHorizontal: 16,
                paddingVertical: 7,
                borderRadius: 8,
                opacity: submitting || !title.trim() ? 0.6 : 1,
              }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text
                  style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}
                >
                  Create
                </Text>
              )}
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
                marginBottom: 20,
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
                placeholder={
                  type === "milestone" ? "Milestone title" : "Project title"
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
