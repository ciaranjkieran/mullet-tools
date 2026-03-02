import React, { useState, useMemo, type ReactElement } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTemplates } from "@shared/api/hooks/templates/useTemplates";
import { useDeleteTemplate } from "@shared/api/hooks/templates/useDeleteTemplate";
import useApplyTemplate from "@shared/api/hooks/templates/useApplyTemplate";
import type {
  Template,
  TemplateMilestoneData,
  TemplateProjectData,
} from "@shared/types/Template";
import type { Mode } from "@shared/types/Mode";

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
        <Text
          key={i}
          style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}
        >
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
        <Text
          key={i}
          style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}
        >
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
        <Feather
          name={template.type === "milestone" ? "flag" : "folder"}
          size={16}
          color={modeColor}
        />
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

      <View style={{ flexDirection: "row", marginTop: 12, gap: 8 }}>
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

type Props = {
  modes: Mode[];
  selectedMode: Mode | "All";
  listHeader?: ReactElement;
};

export default function TemplatesViewContent({ modes, selectedMode, listHeader }: Props) {
  const { data: templates = [], isLoading } = useTemplates();
  const deleteTemplate = useDeleteTemplate();
  const { applyTemplate } = useApplyTemplate();

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

  const modeColor =
    selectedMode === "All" ? "#000" : (selectedMode as Mode).color;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}>
      {listHeader}
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
            : `Mode: ${(selectedMode as Mode).title}`}
        </Text>
      </View>

      {isLoading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
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
        <View style={{ padding: 16 }}>
          {filtered.map((tpl) => {
            const mode = modeMap.get(tpl.mode);
            return (
              <TemplateCard
                key={tpl.id}
                template={tpl}
                modeColor={mode?.color ?? modeColor}
                onUse={() => handleUse(tpl)}
                onDelete={() => handleDelete(tpl)}
                isApplying={applyingId === tpl.id}
              />
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
