import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import EntityIcon from "../components/EntityIcon";
import { useNavigation } from "@react-navigation/native";
import { useTemplates } from "@shared/api/hooks/templates/useTemplates";
import { useDeleteTemplate } from "@shared/api/hooks/templates/useDeleteTemplate";
import useApplyTemplate from "@shared/api/hooks/templates/useApplyTemplate";
import { useModeStore } from "@shared/store/useModeStore";
import type { Template, TemplateMilestoneData, TemplateProjectData } from "@shared/types/Template";

type TabType = "milestone" | "project";

function MilestonePreview({ data }: { data: TemplateMilestoneData }) {
  const items: string[] = [];
  for (const t of data.tasks.slice(0, 3)) items.push(t);
  for (const s of data.subMilestones.slice(0, 2)) items.push(s.title);
  const total = data.tasks.length + data.subMilestones.length;
  const hidden = total - items.length;

  return (
    <View style={{ marginTop: 6 }}>
      {items.map((item, i) => (
        <Text key={i} style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
          · {item}
        </Text>
      ))}
      {hidden > 0 && (
        <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
          +{hidden} more
        </Text>
      )}
    </View>
  );
}

function ProjectPreview({ data }: { data: TemplateProjectData }) {
  const items: string[] = [];
  for (const t of data.tasks.slice(0, 2)) items.push(t);
  for (const m of data.subMilestones.slice(0, 1)) items.push(m.title);
  for (const p of data.subProjects.slice(0, 1)) items.push(p.title);
  const total =
    data.tasks.length + data.subMilestones.length + data.subProjects.length;
  const hidden = total - items.length;

  return (
    <View style={{ marginTop: 6 }}>
      {items.map((item, i) => (
        <Text key={i} style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
          · {item}
        </Text>
      ))}
      {hidden > 0 && (
        <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
          +{hidden} more
        </Text>
      )}
    </View>
  );
}

function TemplateCard({
  template,
  modeColor,
  onUse,
  onDelete,
  isApplying,
}: {
  template: Template;
  modeColor: string;
  onUse: () => void;
  onDelete: () => void;
  isApplying: boolean;
}) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <EntityIcon type={template.type} size={16} color={modeColor} />
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            marginLeft: 8,
            fontSize: 16,
            fontWeight: "600",
            color: "#111",
          }}
        >
          {template.title}
        </Text>
      </View>

      {template.type === "milestone" ? (
        <MilestonePreview data={template.data as TemplateMilestoneData} />
      ) : (
        <ProjectPreview data={template.data as TemplateProjectData} />
      )}

      <View
        style={{
          flexDirection: "row",
          marginTop: 12,
          gap: 8,
        }}
      >
        <TouchableOpacity
          onPress={onUse}
          disabled={isApplying}
          style={{
            flex: 1,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: modeColor,
            alignItems: "center",
          }}
        >
          {isApplying ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>
              Use
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: 8,
            backgroundColor: "#fee2e2",
          }}
        >
          <Feather name="trash-2" size={16} color="#dc2626" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function TemplatesScreen() {
  const navigation = useNavigation();
  const { data: templates = [], isLoading } = useTemplates();
  const deleteTemplate = useDeleteTemplate();
  const { applyTemplate } = useApplyTemplate();
  const modes = useModeStore((s) => s.modes);
  const selectedMode = useModeStore((s) => s.selectedMode);

  const [activeTab, setActiveTab] = useState<TabType>("milestone");
  const [applyingId, setApplyingId] = useState<number | null>(null);

  const modeMap = useMemo(() => {
    const map = new Map<number, { color: string; title: string }>();
    for (const m of modes) map.set(m.id, { color: m.color, title: m.title });
    return map;
  }, [modes]);

  const filtered = useMemo(() => {
    let list = templates.filter((t) => t.type === activeTab);
    if (selectedMode !== "All") {
      list = list.filter((t) => t.mode === selectedMode.id);
    }
    return list;
  }, [templates, activeTab, selectedMode]);

  const handleUse = async (template: Template) => {
    setApplyingId(template.id);
    try {
      await applyTemplate(template);
      Alert.alert("Success", `Template "${template.title}" applied!`);
    } catch {
      Alert.alert("Error", "Failed to apply template.");
    } finally {
      setApplyingId(null);
    }
  };

  const handleDelete = (template: Template) => {
    Alert.alert(
      "Delete Template",
      `Delete "${template.title}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteTemplate.mutate(template.id),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 10,
          gap: 10,
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontWeight: "bold" }}>
          Templates
        </Text>
      </View>

      {/* Tab bar */}
      <View
        style={{
          flexDirection: "row",
          marginHorizontal: 16,
          backgroundColor: "#f3f4f6",
          borderRadius: 10,
          padding: 3,
          marginBottom: 12,
        }}
      >
        {(["milestone", "project"] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: activeTab === tab ? "#fff" : "transparent",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: activeTab === tab ? "600" : "400",
                color: activeTab === tab ? "#111" : "#6b7280",
              }}
            >
              {tab === "milestone" ? "Milestones" : "Projects"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Mode label */}
      <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
        <Text style={{ fontSize: 12, color: "#9ca3af" }}>
          {selectedMode === "All"
            ? "Showing all modes"
            : `Mode: ${selectedMode.title}`}
        </Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", paddingTop: 60 }}>
          <Feather name="layers" size={40} color="#d1d5db" />
          <Text style={{ color: "#9ca3af", fontSize: 16, marginTop: 12 }}>
            No {activeTab} templates
          </Text>
          <Text style={{ color: "#d1d5db", fontSize: 13, marginTop: 4 }}>
            Create templates from the web app
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {filtered.map((tpl) => {
            const mode = modeMap.get(tpl.mode);
            return (
              <TemplateCard
                key={tpl.id}
                template={tpl}
                modeColor={mode?.color ?? "#000"}
                onUse={() => handleUse(tpl)}
                onDelete={() => handleDelete(tpl)}
                isApplying={applyingId === tpl.id}
              />
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
