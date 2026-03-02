import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { getContrastingText } from "@shared/utils/getContrastingText";
import { useEntityFormStore } from "../../lib/store/useEntityFormStore";
import type { EntityFormType } from "../../lib/store/useEntityFormStore";

type Props = {
  modeColor: string;
  onOpenAiBuilder?: () => void;
};

type OptionType = EntityFormType | "ai";

const ENTITY_OPTIONS: {
  type: OptionType;
  icon: keyof typeof Feather.glyphMap;
  label: string;
}[] = [
  { type: "ai", icon: "zap", label: "AI Builder" },
  { type: "goal", icon: "target", label: "Goal" },
  { type: "project", icon: "folder", label: "Project" },
  { type: "milestone", icon: "flag", label: "Milestone" },
];

export default function FAB({ modeColor, onOpenAiBuilder }: Props) {
  const [expanded, setExpanded] = useState(false);
  const openCreate = useEntityFormStore((s) => s.openCreate);
  const textColor = getContrastingText(modeColor);

  const handleMainPress = () => {
    if (expanded) {
      setExpanded(false);
    } else {
      openCreate("task");
    }
  };

  const handleEntityPress = (type: OptionType) => {
    if (type === "ai") {
      onOpenAiBuilder?.();
      setExpanded(false);
      return;
    }
    openCreate(type);
    setExpanded(false);
  };

  return (
    <>
      {expanded && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setExpanded(false)}
        />
      )}
      <View style={styles.container}>
        {expanded &&
          ENTITY_OPTIONS.map((opt, i) => (
            <TouchableOpacity
              key={opt.type}
              onPress={() => handleEntityPress(opt.type)}
              activeOpacity={0.7}
              style={[
                styles.optionButton,
                { backgroundColor: modeColor, bottom: 72 + i * 52 },
              ]}
            >
              <Feather name={opt.icon} size={18} color={textColor} />
              <Text style={[styles.optionLabel, { color: textColor }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}

        <TouchableOpacity
          onPress={handleMainPress}
          onLongPress={() => setExpanded(!expanded)}
          activeOpacity={0.8}
          style={[styles.mainButton, { backgroundColor: modeColor }]}
        >
          <Feather
            name="plus"
            size={28}
            color={textColor}
            style={expanded ? { transform: [{ rotate: "45deg" }] } : undefined}
          />
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 24,
    right: 24,
    alignItems: "flex-end",
  },
  mainButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  optionButton: {
    position: "absolute",
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  optionLabel: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "600",
  },
});
