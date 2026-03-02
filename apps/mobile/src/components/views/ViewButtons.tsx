import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useViewStore, ViewType } from "@shared/store/useViewStore";

type ViewDef = {
  viewType: ViewType;
  label: string;
  icon: keyof typeof Feather.glyphMap;
};

const VIEWS: ViewDef[] = [
  { viewType: "dashboard", label: "Home", icon: "home" },
  { viewType: "calendar", label: "Calendar", icon: "calendar" },
  { viewType: "comments", label: "Comments", icon: "message-square" },
  { viewType: "notes", label: "Notes", icon: "edit" },
  { viewType: "boards", label: "Boards", icon: "grid" },
  { viewType: "templates", label: "Templates", icon: "layers" },
  { viewType: "stats", label: "Stats", icon: "bar-chart-2" },
  { viewType: "timer", label: "Timer", icon: "clock" },
];

const COLS = 4;
const CIRCLE = 44;
const GAP = 8;
const GRID_WIDTH = COLS * CIRCLE + (COLS - 1) * GAP;

type Props = {
  modeColor: string;
};

export default function ViewButtons({ modeColor }: Props) {
  const viewType = useViewStore((s) => s.viewType);
  const setViewType = useViewStore((s) => s.setViewType);

  return (
    <View style={styles.container}>
      {VIEWS.map((def) => {
        const isActive = viewType === def.viewType;
        return (
          <TouchableOpacity
            key={def.viewType}
            onPress={() => setViewType(def.viewType)}
            activeOpacity={0.7}
            style={[
              styles.button,
              isActive
                ? { borderWidth: 2, borderColor: modeColor }
                : { borderWidth: 1, borderColor: "#000" },
            ]}
            accessibilityLabel={`Switch to ${def.label} View`}
          >
            <Feather name={def.icon} size={22} color="#000" />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: GRID_WIDTH,
    columnGap: GAP,
    rowGap: GAP,
    marginLeft: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  button: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
});
