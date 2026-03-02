import React from "react";
import { View, Text } from "react-native";
import type { Assignee } from "@shared/types/Assignee";

type Props = {
  assignee?: Assignee | null;
};

export default function AssigneeBadge({ assignee }: Props) {
  if (!assignee) return null;

  return (
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: "#e0e7ff",
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 6,
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: "600", color: "#4338ca" }}>
        {assignee.displayName.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}
