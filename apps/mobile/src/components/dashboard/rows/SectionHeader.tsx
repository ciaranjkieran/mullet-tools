import React from "react";
import { View, Text } from "react-native";
import type { DashboardRow } from "../../../hooks/useBuildDashboardRows";

type Props = { row: DashboardRow };

function SectionHeader({ row }: Props) {
  const title =
    "title" in row.entity ? (row.entity as { title: string }).title : "";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginTop: 16,
        marginBottom: 6,
        borderLeftWidth: 4,
        borderLeftColor: row.modeColor,
      }}
    >
      <Text style={{ fontSize: 17, fontWeight: "600", color: "#111" }}>
        {title}
      </Text>
    </View>
  );
}

export default React.memo(SectionHeader);
