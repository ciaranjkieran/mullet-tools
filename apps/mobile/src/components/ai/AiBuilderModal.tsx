import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWhiteNavBar } from "../../lib/hooks/useWhiteNavBar";
import { Feather } from "@expo/vector-icons";
import EntityIcon from "../EntityIcon";
import { useAiBuild } from "@shared/api/hooks/ai/useAiBuild";
import { useAiCommit } from "@shared/api/hooks/ai/useAiCommit";
import { useGoalStore } from "@shared/store/useGoalStore";
import { useProjectStore } from "@shared/store/useProjectStore";
import { useMilestoneStore } from "@shared/store/useMilestoneStore";
import { useTaskStore } from "@shared/store/useTaskStore";
import type {
  BuilderNode,
  BuilderNodeType,
  ExistingEntity,
  AiCommitResponse,
} from "@shared/types/AiBuilder";

type Props = {
  visible: boolean;
  onClose: () => void;
  modeId: number;
  modeTitle: string;
  modeColor: string;
};


const OP_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  create: { bg: "#dcfce7", text: "#166534", label: "NEW" },
  update: { bg: "#fef3c7", text: "#92400e", label: "EDIT" },
  delete: { bg: "#fee2e2", text: "#991b1b", label: "DEL" },
  noop: { bg: "#f3f4f6", text: "#6b7280", label: "" },
};

const BUILD_PHASES = [
  "Understanding your request...",
  "Analyzing mode structure...",
  "Structuring changes...",
  "Finalizing plan...",
];

const ENTITY_CYCLE: BuilderNodeType[] = ["goal", "project", "milestone", "task"];

function BuildingIndicator({ modeColor }: { modeColor: string }) {
  const [phase, setPhase] = useState(0);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Rotate the entity icons
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 2400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Cycle through phases
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
      setPhase((p) => (p + 1) % BUILD_PHASES.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const entityIndex = spinAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, 1, 2, 3, 0],
  });

  return (
    <View
      style={{
        padding: 16,
        borderRadius: 12,
        backgroundColor: modeColor + "08",
        borderWidth: 1,
        borderColor: modeColor + "20",
        alignItems: "center",
        gap: 12,
        marginTop: 4,
      }}
    >
      {/* Animated entity icons row */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {ENTITY_CYCLE.map((type, i) => (
          <Animated.View
            key={type}
            style={{
              opacity: spinAnim.interpolate({
                inputRange: [
                  Math.max(0, i / 4 - 0.1),
                  i / 4,
                  Math.min(1, i / 4 + 0.15),
                  Math.min(1, i / 4 + 0.25),
                ],
                outputRange: [0.3, 1, 1, 0.3],
                extrapolate: "clamp",
              }),
              transform: [
                {
                  scale: spinAnim.interpolate({
                    inputRange: [
                      Math.max(0, i / 4 - 0.05),
                      i / 4,
                      Math.min(1, i / 4 + 0.1),
                    ],
                    outputRange: [0.8, 1.2, 0.8],
                    extrapolate: "clamp",
                  }),
                },
              ],
            }}
          >
            <EntityIcon type={type} size={20} color={modeColor} />
          </Animated.View>
        ))}
      </View>

      {/* Phase text */}
      <Animated.Text
        style={{
          fontSize: 14,
          color: "#6b7280",
          fontWeight: "500",
          opacity: fadeAnim,
        }}
      >
        {BUILD_PHASES[phase]}
      </Animated.Text>
    </View>
  );
}

function NodeRow({
  node,
  depth,
  modeColor,
  onToggle,
}: {
  node: BuilderNode;
  depth: number;
  modeColor: string;
  onToggle: (tempId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const op = OP_COLORS[node.op];
  const hasChildren = node.children.length > 0;

  return (
    <View>
      <TouchableOpacity
        onPress={hasChildren ? () => setExpanded(!expanded) : undefined}
        activeOpacity={hasChildren ? 0.6 : 1}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 6,
          paddingHorizontal: 4,
          paddingLeft: depth * 16 + 4,
        }}
      >
        {/* Expand/collapse */}
        {hasChildren ? (
          <Feather
            name={expanded ? "chevron-down" : "chevron-right"}
            size={14}
            color="#9ca3af"
            style={{ width: 18 }}
          />
        ) : (
          <View style={{ width: 18 }} />
        )}

        {/* Include checkbox */}
        <TouchableOpacity
          onPress={() => onToggle(node.tempId)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          style={{ marginRight: 6 }}
        >
          <Feather
            name={node.included ? "check-square" : "square"}
            size={16}
            color={node.included ? modeColor : "#d1d5db"}
          />
        </TouchableOpacity>

        {/* Type icon */}
        <View style={{ marginRight: 6 }}>
          <EntityIcon type={node.type} size={14} color={modeColor} />
        </View>

        {/* Title */}
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontSize: 14,
            color: node.op === "delete" ? "#dc2626" : "#111",
            textDecorationLine: node.op === "delete" ? "line-through" : "none",
          }}
        >
          {node.title}
        </Text>

        {/* Op badge */}
        {op.label ? (
          <View
            style={{
              backgroundColor: op.bg,
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
              marginLeft: 6,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: "700", color: op.text }}>
              {op.label}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>

      {expanded &&
        node.children.map((child) => (
          <NodeRow
            key={child.tempId}
            node={child}
            depth={depth + 1}
            modeColor={modeColor}
            onToggle={onToggle}
          />
        ))}
    </View>
  );
}

export default function AiBuilderModal({
  visible,
  onClose,
  modeId,
  modeTitle,
  modeColor,
}: Props) {
  useWhiteNavBar(visible);
  const [prompt, setPrompt] = useState("");
  const [nodes, setNodes] = useState<BuilderNode[]>([]);
  const [history, setHistory] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [commandLog, setCommandLog] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([]);
  const [commitResult, setCommitResult] = useState<AiCommitResponse | null>(
    null
  );
  const scrollRef = useRef<ScrollView>(null);

  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const { build, isPending: isBuildPending, isError: isBuildError, abort } = useAiBuild();
  const commitMutation = useAiCommit();

  // Show error in command log when build fails
  useEffect(() => {
    if (isBuildError) {
      setCommandLog((prev) => [
        ...prev,
        { role: "assistant", text: "Error: Failed to get response. Try again." },
      ]);
    }
  }, [isBuildError]);

  const goals = useGoalStore((s) => s.goals);
  const projects = useProjectStore((s) => s.projects);
  const milestones = useMilestoneStore((s) => s.milestones);
  const tasks = useTaskStore((s) => s.tasks);

  const buildEntitySnapshot = (): ExistingEntity[] => {
    const out: ExistingEntity[] = [];
    for (const g of goals) {
      if (g.modeId === modeId)
        out.push({ id: g.id, type: "goal", title: g.title, dueDate: g.dueDate });
    }
    for (const p of projects) {
      if (p.modeId === modeId)
        out.push({
          id: p.id,
          type: "project",
          title: p.title,
          dueDate: p.dueDate ?? null,
          goalId: p.goalId,
          parentId: p.parentId,
        });
    }
    for (const m of milestones) {
      if (m.modeId === modeId)
        out.push({
          id: m.id,
          type: "milestone",
          title: m.title,
          dueDate: m.dueDate ?? null,
          goalId: m.goalId,
          projectId: m.projectId,
          parentId: m.parentId,
        });
    }
    for (const t of tasks) {
      if (t.modeId === modeId)
        out.push({
          id: t.id,
          type: "task",
          title: t.title,
          dueDate: t.dueDate ?? null,
          goalId: t.goalId,
          projectId: t.projectId,
          milestoneId: t.milestoneId,
        });
    }
    return out;
  };

  const handleSend = () => {
    const text = prompt.trim();
    if (!text) return;
    setPrompt("");

    setCommandLog((prev) => [...prev, { role: "user", text }]);

    const entities = buildEntitySnapshot();
    build(
      { prompt: text, modeId, history, entities },
      (result) => {
        setNodes(result.nodes);
        setHistory((prev) => [
          ...prev,
          { role: "user", content: text },
          { role: "assistant", content: result.summary },
        ]);
        setCommandLog((prev) => [
          ...prev,
          { role: "assistant", text: result.summary },
        ]);
        setCommitResult(null);

        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
          inputRef.current?.focus();
        }, 100);
      }
    );

    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const toggleNode = (tempId: string) => {
    const toggle = (ns: BuilderNode[]): BuilderNode[] =>
      ns.map((n) => {
        if (n.tempId === tempId) {
          const newIncluded = !n.included;
          return {
            ...n,
            included: newIncluded,
            children: setChildrenIncluded(n.children, newIncluded),
          };
        }
        return { ...n, children: toggle(n.children) };
      });
    setNodes(toggle);
  };

  const setChildrenIncluded = (
    ns: BuilderNode[],
    included: boolean
  ): BuilderNode[] =>
    ns.map((n) => ({
      ...n,
      included,
      children: setChildrenIncluded(n.children, included),
    }));

  const countOps = useMemo(() => {
    let creates = 0,
      updates = 0,
      deletes = 0;
    const count = (ns: BuilderNode[]) => {
      for (const n of ns) {
        if (n.included) {
          if (n.op === "create") creates++;
          else if (n.op === "update") updates++;
          else if (n.op === "delete") deletes++;
        }
        count(n.children);
      }
    };
    count(nodes);
    return { creates, updates, deletes };
  }, [nodes]);

  const filterIncluded = (ns: BuilderNode[]): BuilderNode[] =>
    ns
      .filter((n) => n.included || n.op === "noop")
      .map((n) => ({ ...n, children: filterIncluded(n.children) }));

  const handleCommit = async () => {
    try {
      const filtered = filterIncluded(nodes);
      const result = await commitMutation.mutateAsync({
        modeId,
        nodes: filtered,
      });
      setCommitResult(result);
      setNodes([]);
    } catch {
      Alert.alert("Error", "Failed to apply changes. Please try again.");
    }
  };

  const handleClose = () => {
    abort();
    setPrompt("");
    setNodes([]);
    setHistory([]);
    setCommandLog([]);
    setCommitResult(null);
    onClose();
  };

  const hasChanges =
    countOps.creates > 0 || countOps.updates > 0 || countOps.deletes > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: "#fff", paddingTop: insets.top }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: "#e5e7eb",
          }}
        >
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: modeColor,
              marginRight: 8,
            }}
          />
          <Text style={{ flex: 1, fontSize: 17, fontWeight: "600" }}>
            AI Builder · {modeTitle}
          </Text>
          <TouchableOpacity onPress={handleClose}>
            <Feather name="x" size={22} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          {/* Command log */}
          {commandLog.map((entry, i) => (
            <View
              key={i}
              style={{
                marginBottom: 10,
                padding: 10,
                borderRadius: 10,
                backgroundColor:
                  entry.role === "user" ? modeColor + "15" : "#f3f4f6",
                alignSelf: entry.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: entry.role === "user" ? "#111" : "#374151",
                }}
              >
                {entry.text}
              </Text>
            </View>
          ))}

          {isBuildPending && <BuildingIndicator modeColor={modeColor} />}

          {/* Node tree */}
          {nodes.length > 0 && (
            <View
              style={{
                marginTop: 8,
                borderWidth: 1,
                borderColor: "#e5e7eb",
                borderRadius: 10,
                padding: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: "#6b7280",
                  marginBottom: 6,
                }}
              >
                Proposed changes:
              </Text>
              {nodes.map((node) => (
                <NodeRow
                  key={node.tempId}
                  node={node}
                  depth={0}
                  modeColor={modeColor}
                  onToggle={toggleNode}
                />
              ))}
            </View>
          )}

          {/* Commit result */}
          {commitResult && (
            <View
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 10,
                backgroundColor: "#dcfce7",
              }}
            >
              <Text
                style={{ fontSize: 14, fontWeight: "600", color: "#166534" }}
              >
                Changes applied!
              </Text>
              <Text style={{ fontSize: 13, color: "#15803d", marginTop: 4 }}>
                Created: {commitResult.created.goals + commitResult.created.projects + commitResult.created.milestones + commitResult.created.tasks}
                {" · "}Updated: {commitResult.updated.goals + commitResult.updated.projects + commitResult.updated.milestones + commitResult.updated.tasks}
                {" · "}Deleted: {commitResult.deleted.goals + commitResult.deleted.projects + commitResult.deleted.milestones + commitResult.deleted.tasks}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Commit bar */}
        {hasChanges && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderTopWidth: 1,
              borderTopColor: "#e5e7eb",
              backgroundColor: "#f9fafb",
            }}
          >
            <Text style={{ fontSize: 13, color: "#6b7280" }}>
              {countOps.creates > 0 && `+${countOps.creates} `}
              {countOps.updates > 0 && `~${countOps.updates} `}
              {countOps.deletes > 0 && `-${countOps.deletes}`}
            </Text>
            <TouchableOpacity
              onPress={handleCommit}
              disabled={commitMutation.isPending}
              style={{
                backgroundColor: modeColor,
                paddingHorizontal: 20,
                paddingVertical: 8,
                borderRadius: 8,
              }}
            >
              {commitMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text
                  style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}
                >
                  Apply
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Input bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: Math.max(insets.bottom, 10),
            borderTopWidth: 1,
            borderTopColor: "#e5e7eb",
            backgroundColor: "#fff",
            gap: 8,
          }}
        >
          <TextInput
            ref={inputRef}
            value={prompt}
            onChangeText={setPrompt}
            placeholder="Describe what to build..."
            placeholderTextColor="#9ca3af"
            multiline
            blurOnSubmit={false}
            autoCorrect
            textAlignVertical="top"
            style={{
              flex: 1,
              minHeight: 44,
              maxHeight: 120,
              fontSize: 16,
              color: "#111",
              borderWidth: 1,
              borderColor: "#d1d5db",
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingTop: 12,
              paddingBottom: 12,
              backgroundColor: "#f9fafb",
            }}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!prompt.trim() || isBuildPending}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor:
                prompt.trim() && !isBuildPending
                  ? modeColor
                  : "#e5e7eb",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Feather name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
