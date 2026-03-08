import React from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import EntityIcon from "../EntityIcon";
import type { TemplateMilestoneData } from "@shared/types/Template";
import {
  addTask,
  removeTask,
  updateTask,
  addSubMilestone,
  removeSubMilestone,
  updateSubMilestone,
} from "@shared/utils/milestoneTemplateUtils";

type Props = {
  node: TemplateMilestoneData;
  onChange: (updated: TemplateMilestoneData) => void;
  depth?: number;
  modeColor: string;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
};

export default function MilestoneEditorMobile({
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
      {/* Sub-milestone header (root title is handled by parent modal) */}
      {!isRoot && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <EntityIcon type="milestone" size={18} color={modeColor} />
          <TextInput
            value={node.title}
            onChangeText={(v) => onChange({ ...node, title: v })}
            placeholder="Sub-Milestone Title"
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
      {node.tasks.map((task, i) => (
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
                  const tasks = [...node.tasks];
                  [tasks[i - 1], tasks[i]] = [tasks[i], tasks[i - 1]];
                  onChange({ ...node, tasks });
                }}
                style={{ padding: 4 }}
              >
                <Feather name="chevron-up" size={16} color="#9ca3af" />
              </TouchableOpacity>
            )}
            {i < node.tasks.length - 1 && (
              <TouchableOpacity
                onPress={() => {
                  const tasks = [...node.tasks];
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

      {/* Sub-Milestones */}
      {(node.subMilestones || []).map((sub, i) => (
        <View
          key={i}
          style={{
            borderLeftWidth: 2,
            borderLeftColor: modeColor + "40",
            paddingLeft: 12,
            marginBottom: 8,
          }}
        >
          <MilestoneEditorMobile
            node={sub}
            onChange={(updated) => onChange(updateSubMilestone(node, i, updated))}
            depth={depth + 1}
            modeColor={modeColor}
            onRemove={() => onChange(removeSubMilestone(node, i))}
            onMoveUp={
              i > 0
                ? () => {
                    const subs = [...node.subMilestones];
                    [subs[i - 1], subs[i]] = [subs[i], subs[i - 1]];
                    onChange({ ...node, subMilestones: subs });
                  }
                : undefined
            }
            onMoveDown={
              i < node.subMilestones.length - 1
                ? () => {
                    const subs = [...node.subMilestones];
                    [subs[i], subs[i + 1]] = [subs[i + 1], subs[i]];
                    onChange({ ...node, subMilestones: subs });
                  }
                : undefined
            }
          />
        </View>
      ))}

      <TouchableOpacity
        onPress={() => onChange(addSubMilestone(node))}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginLeft: isRoot ? 0 : 8,
        }}
      >
        <Feather name="plus" size={16} color={modeColor} />
        <Text style={{ fontSize: 14, fontWeight: "500", color: modeColor }}>
          Add Sub-Milestone
        </Text>
      </TouchableOpacity>
    </View>
  );
}
