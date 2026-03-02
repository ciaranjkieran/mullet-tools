import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useGoalStore } from "@shared/store/useGoalStore";
import { useProjectStore } from "@shared/store/useProjectStore";
import { useMilestoneStore } from "@shared/store/useMilestoneStore";
import { useTaskStore } from "@shared/store/useTaskStore";
import { useModeStore } from "@shared/store/useModeStore";
import { useUpdateGoal } from "@shared/api/hooks/goals/useUpdateGoal";
import { useUpdateProject } from "@shared/api/hooks/projects/useUpdateProject";
import { useUpdateMilestone } from "@shared/api/hooks/milestones/useUpdateMilestone";
import { useUpdateTask } from "@shared/api/hooks/tasks/useUpdateTask";
import { useEntityFormStore } from "../lib/store/useEntityFormStore";
import type { EntityFormType } from "../lib/store/useEntityFormStore";
import EntityFormModal from "../components/dashboard/EntityFormModal";

type SearchResult = {
  id: number;
  type: "goal" | "project" | "milestone" | "task";
  title: string;
  modeId: number;
  modeColor: string;
  modeTitle: string;
  isCompleted: boolean;
  entity: any;
};

const ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  goal: "target",
  project: "folder",
  milestone: "flag",
  task: "circle",
};

export default function SearchScreen() {
  const navigation = useNavigation();
  const [query, setQuery] = useState("");
  const formStore = useEntityFormStore();

  const goals = useGoalStore((s) => s.goals);
  const projects = useProjectStore((s) => s.projects);
  const milestones = useMilestoneStore((s) => s.milestones);
  const tasks = useTaskStore((s) => s.tasks);
  const modes = useModeStore((s) => s.modes);

  const updateGoal = useUpdateGoal();
  const updateProject = useUpdateProject();
  const updateMilestone = useUpdateMilestone();
  const updateTask = useUpdateTask();

  const modeMap = useMemo(() => {
    const map = new Map<number, { color: string; title: string }>();
    for (const m of modes) {
      map.set(m.id, { color: m.color, title: m.title });
    }
    return map;
  }, [modes]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const out: SearchResult[] = [];

    for (const g of goals) {
      if (g.title.toLowerCase().includes(q)) {
        const mode = modeMap.get(g.modeId);
        out.push({
          id: g.id,
          type: "goal",
          title: g.title,
          modeId: g.modeId,
          modeColor: mode?.color ?? "#000",
          modeTitle: mode?.title ?? "",
          isCompleted: g.isCompleted,
          entity: g,
        });
      }
    }

    for (const p of projects) {
      if (p.title.toLowerCase().includes(q)) {
        const mode = modeMap.get(p.modeId);
        out.push({
          id: p.id,
          type: "project",
          title: p.title,
          modeId: p.modeId,
          modeColor: mode?.color ?? "#000",
          modeTitle: mode?.title ?? "",
          isCompleted: p.isCompleted,
          entity: p,
        });
      }
    }

    for (const m of milestones) {
      if (m.title.toLowerCase().includes(q)) {
        const mode = modeMap.get(m.modeId);
        out.push({
          id: m.id,
          type: "milestone",
          title: m.title,
          modeId: m.modeId,
          modeColor: mode?.color ?? "#000",
          modeTitle: mode?.title ?? "",
          isCompleted: m.isCompleted,
          entity: m,
        });
      }
    }

    for (const t of tasks) {
      if (t.title.toLowerCase().includes(q)) {
        const mode = modeMap.get(t.modeId);
        out.push({
          id: t.id,
          type: "task",
          title: t.title,
          modeId: t.modeId,
          modeColor: mode?.color ?? "#000",
          modeTitle: mode?.title ?? "",
          isCompleted: t.isCompleted,
          entity: t,
        });
      }
    }

    return out.slice(0, 50);
  }, [query, goals, projects, milestones, tasks, modeMap]);

  const handleToggleComplete = (item: SearchResult) => {
    const payload = { id: item.id, isCompleted: !item.isCompleted };
    switch (item.type) {
      case "goal":
        updateGoal.mutate(payload);
        break;
      case "project":
        updateProject.mutate(payload);
        break;
      case "milestone":
        updateMilestone.mutate(payload);
        break;
      case "task":
        updateTask.mutate(payload);
        break;
    }
  };

  const handleTap = (item: SearchResult) => {
    formStore.openEdit(item.type as EntityFormType, item.entity);
  };

  const renderItem = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      onPress={() => handleTap(item)}
      activeOpacity={0.6}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
      }}
    >
      <TouchableOpacity
        onPress={() => handleToggleComplete(item)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather
          name={item.isCompleted ? "check-circle" : ICONS[item.type]}
          size={18}
          color={item.isCompleted ? "#9ca3af" : item.modeColor}
        />
      </TouchableOpacity>

      <View
        style={{
          width: 3,
          height: 20,
          borderRadius: 1.5,
          backgroundColor: item.modeColor,
          marginLeft: 10,
          marginRight: 10,
        }}
      />

      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 15,
            color: item.isCompleted ? "#9ca3af" : "#111",
            textDecorationLine: item.isCompleted ? "line-through" : "none",
          }}
        >
          {item.title}
        </Text>
        <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
          {item.modeTitle} · {item.type}
        </Text>
      </View>
    </TouchableOpacity>
  );

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
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#f3f4f6",
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Feather name="search" size={18} color="#9ca3af" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search entities..."
            placeholderTextColor="#9ca3af"
            autoFocus
            style={{
              flex: 1,
              marginLeft: 8,
              fontSize: 16,
              color: "#111",
              padding: 0,
            }}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Feather name="x" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results */}
      {query.trim().length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", paddingTop: 60 }}>
          <Feather name="search" size={40} color="#d1d5db" />
          <Text style={{ color: "#9ca3af", fontSize: 16, marginTop: 12 }}>
            Search across all your entities
          </Text>
        </View>
      ) : results.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", paddingTop: 60 }}>
          <Feather name="inbox" size={40} color="#d1d5db" />
          <Text style={{ color: "#9ca3af", fontSize: 16, marginTop: 12 }}>
            No results for "{query}"
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}

      <EntityFormModal
        visible={formStore.visible}
        onClose={formStore.close}
        entityType={formStore.entityType}
        editEntity={formStore.editEntity}
        defaultModeId={formStore.editEntity?.modeId ?? 0}
      />
    </SafeAreaView>
  );
}
