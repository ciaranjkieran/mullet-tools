import React, { useState, useMemo, useEffect, type ReactElement } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import EntityIcon from "../EntityIcon";
import { useTemplates } from "@shared/api/hooks/templates/useTemplates";
import { useDeleteTemplate } from "@shared/api/hooks/templates/useDeleteTemplate";
import { useTemplateWorkbenchStore } from "@shared/store/useTemplateWorkbenchStore";
import BuildTemplateModal from "../template/BuildTemplateModal";
import EditTemplateModal from "../template/EditTemplateModal";
import UseTemplateModal from "../template/UseTemplateModal";
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
          · {item || "(untitled)"}
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
          · {item || "(untitled)"}
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
  onEdit,
  onDelete,
}: {
  template: Template;
  modeColor: string;
  onUse: () => void;
  onEdit: () => void;
  onDelete: () => void;
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

      <View style={{ flexDirection: "row", marginTop: 12, gap: 8 }}>
        <TouchableOpacity
          onPress={onUse}
          style={{
            flex: 1,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: modeColor,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>
            Use
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onEdit}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: 8,
            backgroundColor: "#f3f4f6",
          }}
        >
          <Feather name="edit-2" size={16} color="#6b7280" />
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

export default function TemplatesViewContent({
  modes,
  selectedMode,
  listHeader,
}: Props) {
  const { data: templates = [], isLoading } = useTemplates();
  const deleteTemplate = useDeleteTemplate();

  const [activeTab, setActiveTab] = useState<TabType>("milestone");
  const [buildModalOpen, setBuildModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [usingTemplate, setUsingTemplate] = useState<Template | null>(null);

  // Workbench draft from "Launch as Template" in EntityFormModal
  const workbenchDraft = useTemplateWorkbenchStore((s) => s.draft);
  const workbenchOpen = useTemplateWorkbenchStore((s) => s.isOpen);
  const workbenchClear = useTemplateWorkbenchStore((s) => s.clear);

  const [prefillMilestone, setPrefillMilestone] = useState<TemplateMilestoneData | undefined>();
  const [prefillProject, setPrefillProject] = useState<TemplateProjectData | undefined>();
  const [prefillModeId, setPrefillModeId] = useState<number | undefined>();

  useEffect(() => {
    if (workbenchOpen && workbenchDraft) {
      if (workbenchDraft.type === "milestone") {
        setPrefillMilestone(workbenchDraft.data as TemplateMilestoneData);
        setPrefillProject(undefined);
      } else {
        setPrefillProject(workbenchDraft.data as TemplateProjectData);
        setPrefillMilestone(undefined);
      }
      setPrefillModeId(workbenchDraft.modeId);
      setActiveTab(workbenchDraft.type);
      setBuildModalOpen(true);
      workbenchClear();
    }
  }, [workbenchOpen, workbenchDraft, workbenchClear]);

  const handleBuildClose = () => {
    setBuildModalOpen(false);
    setPrefillMilestone(undefined);
    setPrefillProject(undefined);
    setPrefillModeId(undefined);
  };

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

  const handleUse = (template: Template) => {
    setUsingTemplate(template);
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
    <>
      <ScrollView contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}>
        {listHeader}

        {/* Tab bar + create button row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginHorizontal: 16,
            marginBottom: 12,
            gap: 8,
          }}
        >
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              backgroundColor: "#f3f4f6",
              borderRadius: 10,
              padding: 3,
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
          <TouchableOpacity
            onPress={() => setBuildModalOpen(true)}
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              backgroundColor: "#f3f4f6",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Feather name="plus" size={20} color="#374151" />
          </TouchableOpacity>
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
            <TouchableOpacity
              onPress={() => setBuildModalOpen(true)}
              style={{ marginTop: 16 }}
            >
              <Text
                style={{ color: "#3b82f6", fontSize: 14, fontWeight: "600" }}
              >
                Create one
              </Text>
            </TouchableOpacity>
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
                  onEdit={() => setEditingTemplate(tpl)}
                  onDelete={() => handleDelete(tpl)}
                />
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Build Modal */}
      <BuildTemplateModal
        visible={buildModalOpen}
        onClose={handleBuildClose}
        modes={modes}
        initialType={activeTab}
        prefillMilestone={prefillMilestone}
        prefillProject={prefillProject}
        prefillModeId={
          prefillModeId ??
          (selectedMode !== "All" ? (selectedMode as Mode).id : undefined)
        }
      />

      {/* Edit Modal */}
      <EditTemplateModal
        visible={editingTemplate !== null}
        onClose={() => setEditingTemplate(null)}
        template={editingTemplate}
        modes={modes}
      />

      {/* Use Modal */}
      <UseTemplateModal
        visible={usingTemplate !== null}
        onClose={() => setUsingTemplate(null)}
        template={usingTemplate}
        modes={modes}
      />
    </>
  );
}
