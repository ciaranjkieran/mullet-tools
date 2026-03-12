import React, { useState, useRef, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Dimensions,
  PanResponder,
  Animated,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import EntityIcon from "../EntityIcon";
import { getContrastingText } from "@shared/utils/getContrastingText";
import { useEntityFormStore } from "../../lib/store/useEntityFormStore";
import type { EntityFormType } from "../../lib/store/useEntityFormStore";

type Props = {
  modeColor: string;
  onOpenAiBuilder?: () => void;
  defaultDate?: string;
};

const DRAG_THRESHOLD = 8;
const SCREEN = Dimensions.get("window");

export default function FAB({ modeColor, onOpenAiBuilder, defaultDate }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [pos, setPos] = useState({ bottom: 24, right: 24 });
  const openCreate = useEntityFormStore((s) => s.openCreate);
  const textColor = getContrastingText(modeColor);

  // Drag tracking (refs to avoid re-renders during drag)
  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startBottom: 0,
    startRight: 0,
    moved: false,
  });
  const lastDragEnd = useRef(0);
  const wasDrag = () => Date.now() - lastDragEnd.current < 250;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > DRAG_THRESHOLD || Math.abs(g.dy) > DRAG_THRESHOLD,
      onPanResponderGrant: (_, g) => {
        dragRef.current = {
          active: true,
          startX: g.x0,
          startY: g.y0,
          startBottom: pos.bottom,
          startRight: pos.right,
          moved: false,
        };
      },
      onPanResponderMove: (_, g) => {
        const d = dragRef.current;
        if (
          !d.moved &&
          Math.abs(g.dx) < DRAG_THRESHOLD &&
          Math.abs(g.dy) < DRAG_THRESHOLD
        )
          return;
        d.moved = true;
        const maxRight = SCREEN.width - 80;
        const maxBottom = SCREEN.height - 200;
        setPos({
          right: Math.max(8, Math.min(maxRight, d.startRight - g.dx)),
          bottom: Math.max(8, Math.min(maxBottom, d.startBottom + g.dy * -1)),
        });
      },
      onPanResponderRelease: () => {
        if (dragRef.current.moved) {
          lastDragEnd.current = Date.now();
        }
        dragRef.current.active = false;
      },
    })
  ).current;

  const handleEntityCreatorPress = useCallback(() => {
    if (!wasDrag()) setExpanded((p) => !p);
  }, []);

  const createOpts = defaultDate ? { defaultDate } : undefined;

  const handleTaskPress = useCallback(() => {
    if (!wasDrag()) {
      setExpanded(false);
      openCreate("task", createOpts);
    }
  }, [openCreate, createOpts]);

  const handleAiPress = useCallback(() => {
    if (!wasDrag()) {
      setExpanded(false);
      onOpenAiBuilder?.();
    }
  }, [onOpenAiBuilder]);

  const handleEntitySelect = useCallback(
    (type: EntityFormType) => {
      setExpanded(false);
      openCreate(type, createOpts);
    },
    [openCreate, createOpts]
  );

  const expandedEntities: { type: EntityFormType; label: string }[] = [
    { type: "goal", label: "Goal" },
    { type: "project", label: "Project" },
    { type: "milestone", label: "Milestone" },
  ];

  const btnShadow = {
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  };

  return (
    <>
      {/* Overlay to dismiss expanded menu */}
      {expanded && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setExpanded(false)}
        />
      )}

      <View
        style={[styles.container, { bottom: pos.bottom, right: pos.right }]}
        {...panResponder.panHandlers}
      >
        {/* Expanded entity buttons — fan out above entity creator */}
        {expanded &&
          expandedEntities.map((ent, i) => (
            <TouchableOpacity
              key={ent.type}
              onPress={() => handleEntitySelect(ent.type)}
              activeOpacity={0.7}
              style={[
                styles.smallButton,
                btnShadow,
                { backgroundColor: modeColor, marginBottom: 10 },
              ]}
            >
              <EntityIcon type={ent.type} color={textColor} size={20} />
            </TouchableOpacity>
          ))}

        {/* Entity Creator button */}
        <TouchableOpacity
          onPress={handleEntityCreatorPress}
          activeOpacity={0.8}
          style={[
            styles.smallButton,
            btnShadow,
            {
              backgroundColor: modeColor,
              transform: [{ rotate: expanded ? "45deg" : "0deg" }],
            },
          ]}
        >
          {/* Composite icon: show all 3 entity icons arranged */}
          <View style={styles.compositeIcon}>
            <View style={styles.compositeTop}>
              <EntityIcon type="milestone" color={textColor} size={14} />
            </View>
            <View style={styles.compositeBottom}>
              <EntityIcon type="project" color={textColor} size={12} />
              <EntityIcon type="goal" color={textColor} size={12} />
            </View>
          </View>
        </TouchableOpacity>

        {/* Add Task button */}
        <TouchableOpacity
          onPress={handleTaskPress}
          activeOpacity={0.8}
          style={[
            styles.smallButton,
            btnShadow,
            { backgroundColor: modeColor, marginTop: 10 },
          ]}
        >
          <Feather name="plus" size={24} color={textColor} />
        </TouchableOpacity>

        {/* AI Builder button */}
        <TouchableOpacity
          onPress={handleAiPress}
          activeOpacity={0.8}
          style={[
            styles.smallButton,
            btnShadow,
            { backgroundColor: modeColor, marginTop: 10 },
          ]}
        >
          <Feather name="zap" size={20} color={textColor} />
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    alignItems: "center",
  },
  smallButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  compositeIcon: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  compositeTop: {
    alignItems: "center",
    marginBottom: -2,
  },
  compositeBottom: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 2,
  },
});
