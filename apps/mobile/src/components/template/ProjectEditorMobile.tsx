import React from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import EntityIcon from "../EntityIcon";
import MilestoneEditorMobile from "./MilestoneEditorMobile";
import type {
  TemplateProjectData,
  TemplateMilestoneData,
} from "@shared/types/Template";
import {
  addTask,
  removeTask,
  updateTask,
  addSubProject,
  removeSubProject,
  updateSubProject,
  addMilestone,
  removeMilestone,
  updateMilestone,
} from "@shared/utils/projectTemplateUtils";

type Props = {
  node: TemplateProjectData;
  onChange: (updated: TemplateProjectData) => void;
  depth?: number;
  modeColor: string;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
};

export default function ProjectEditorMobile({
  node,
  onChange,
  depth = 0,
  modeColor,
  onRemove,
  onMoveUp,
  onMoveDown,
}: Props) {
  const isRoot = depth === 0;

  return (
    <View style={{ marginLeft: depth > 0 ? 16 : 0 }}>
      {/* Sub-project header (root title handled by parent modal) */}
      {!isRoot && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <EntityIcon type="project" size={18} color={modeColor} />
          <TextInput
            value={node.title}
            onChangeText={(v) => onChange({ ...node, title: v })}
            placeholder="Sub-Project Title"
            placeholderTextColor="#9ca3af"
            style={{
              flex: 1,
              fontSize: 16,
              fontWeight: "600",
              color: "#111",
              padding: 0,
            }}
          />
          <View style={{ flexDirection: "row", gap: 2 }}>
            {onMoveUp && (
              <TouchableOpacity onPress={onMoveUp} style={{ padding: 4 }}>
                <Feather name="chevron-up" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
            {onMoveDown && (
              <TouchableOpacity onPress={onMoveDown} style={{ padding: 4 }}>
                <Feather name="chevron-down" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
            {onRemove && (
              <TouchableOpacity onPress={onRemove} style={{ padding: 4 }}>
                <Feather name="trash-2" size={16} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Tasks */}
      {(node.tasks || []).map((task, i) => (
        <View
          key={i}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
            marginLeft: isRoot ? 0 : 8,
          }}
        >
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: modeColor,
            }}
          />
          <TextInput
            value={task}
            onChangeText={(v) => onChange(updateTask(node, i, v))}
            placeholder={`Task ${i + 1}`}
            placeholderTextColor="#9ca3af"
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: modeColor + "60",
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              fontSize: 14,
              color: "#111",
            }}
          />
          <View style={{ flexDirection: "row", gap: 2 }}>
            {i > 0 && (
              <TouchableOpacity
                onPress={() => {
                  const tasks = [...(node.tasks || [])];
                  [tasks[i - 1], tasks[i]] = [tasks[i], tasks[i - 1]];
                  onChange({ ...node, tasks });
                }}
                style={{ padding: 4 }}
              >
                <Feather name="chevron-up" size={16} color="#9ca3af" />
              </TouchableOpacity>
            )}
            {i < (node.tasks || []).length - 1 && (
              <TouchableOpacity
                onPress={() => {
                  const tasks = [...(node.tasks || [])];
                  [tasks[i], tasks[i + 1]] = [tasks[i + 1], tasks[i]];
                  onChange({ ...node, tasks });
                }}
                style={{ padding: 4 }}
              >
                <Feather name="chevron-down" size={16} color="#9ca3af" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => onChange(removeTask(node, i))}
              style={{ padding: 4 }}
            >
              <Feather name="x" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <TouchableOpacity
        onPress={() => onChange(addTask(node))}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginBottom: 12,
          marginLeft: isRoot ? 0 : 8,
        }}
      >
        <Feather name="plus" size={16} color={modeColor} />
        <Text style={{ fontSize: 14, fontWeight: "500", color: modeColor }}>
          Add Task
        </Text>
      </TouchableOpacity>

      {/* Milestones */}
      {(node.subMilestones || []).map((milestone, i) => (
        <View
          key={`ms-${i}`}
          style={{
            borderLeftWidth: 2,
            borderLeftColor: modeColor + "40",
            paddingLeft: 12,
            marginBottom: 8,
          }}
        >
          <MilestoneEditorMobile
            node={milestone}
            onChange={(updated) => onChange(updateMilestone(node, i, updated))}
            depth={depth + 1}
            modeColor={modeColor}
            onRemove={() => onChange(removeMilestone(node, i))}
            onMoveUp={
              i > 0
                ? () => {
                    const ms = [...(node.subMilestones || [])];
                    [ms[i - 1], ms[i]] = [ms[i], ms[i - 1]];
                    onChange({ ...node, subMilestones: ms });
                  }
                : undefined
            }
            onMoveDown={
              i < (node.subMilestones || []).length - 1
                ? () => {
                    const ms = [...(node.subMilestones || [])];
                    [ms[i], ms[i + 1]] = [ms[i + 1], ms[i]];
                    onChange({ ...node, subMilestones: ms });
                  }
                : undefined
            }
          />
        </View>
      ))}

      <TouchableOpacity
        onPress={() => onChange(addMilestone(node))}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginBottom: 12,
          marginLeft: isRoot ? 0 : 8,
        }}
      >
        <Feather name="plus" size={16} color={modeColor} />
        <Text style={{ fontSize: 14, fontWeight: "500", color: modeColor }}>
          Add Milestone
        </Text>
      </TouchableOpacity>

      {/* Sub-Projects */}
      {(node.subProjects || []).map((sub, i) => (
        <View
          key={`sp-${i}`}
          style={{
            borderLeftWidth: 2,
            borderLeftColor: modeColor + "40",
            paddingLeft: 12,
            marginBottom: 8,
          }}
        >
          <ProjectEditorMobile
            node={sub}
            onChange={(updated) => onChange(updateSubProject(node, i, updated))}
            depth={depth + 1}
            modeColor={modeColor}
            onRemove={() => onChange(removeSubProject(node, i))}
            onMoveUp={
              i > 0
                ? () => {
                    const sps = [...(node.subProjects || [])];
                    [sps[i - 1], sps[i]] = [sps[i], sps[i - 1]];
                    onChange({ ...node, subProjects: sps });
                  }
                : undefined
            }
            onMoveDown={
              i < (node.subProjects || []).length - 1
                ? () => {
                    const sps = [...(node.subProjects || [])];
                    [sps[i], sps[i + 1]] = [sps[i + 1], sps[i]];
                    onChange({ ...node, subProjects: sps });
                  }
                : undefined
            }
          />
        </View>
      ))}

      <TouchableOpacity
        onPress={() => onChange(addSubProject(node))}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginLeft: isRoot ? 0 : 8,
        }}
      >
        <Feather name="plus" size={16} color={modeColor} />
        <Text style={{ fontSize: 14, fontWeight: "500", color: modeColor }}>
          Add Sub-Project
        </Text>
      </TouchableOpacity>
    </View>
  );
}
