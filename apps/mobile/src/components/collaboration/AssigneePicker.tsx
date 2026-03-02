import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useModeMembers } from "@shared/api/hooks/collaboration/useModeMembers";

type Props = {
  modeId: number;
  selectedId: number | null;
  onChange: (id: number | null) => void;
};

export default function AssigneePicker({ modeId, selectedId, onChange }: Props) {
  const { data } = useModeMembers(modeId);
  const members = data?.members ?? [];

  // Only show when there are multiple members (collaboration mode)
  if (members.length <= 1) return null;

  return (
    <View>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: "#374151",
          marginBottom: 6,
          marginTop: 16,
        }}
      >
        Assignee
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 12 }}
      >
        <TouchableOpacity
          onPress={() => onChange(null)}
          style={[chipStyle, !selectedId && chipActiveStyle]}
        >
          <Feather
            name="user-x"
            size={13}
            color={!selectedId ? "#fff" : "#6b7280"}
            style={{ marginRight: 4 }}
          />
          <Text style={[chipText, !selectedId && chipActiveText]}>
            Unassigned
          </Text>
        </TouchableOpacity>
        {members.map((m) => (
          <TouchableOpacity
            key={m.id}
            onPress={() => onChange(m.id)}
            style={[chipStyle, selectedId === m.id && chipActiveStyle]}
          >
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: selectedId === m.id ? "rgba(255,255,255,0.3)" : "#e5e7eb",
                justifyContent: "center",
                alignItems: "center",
                marginRight: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "600",
                  color: selectedId === m.id ? "#fff" : "#6b7280",
                }}
              >
                {m.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={[chipText, selectedId === m.id && chipActiveText]}>
              {m.displayName}
              {m.role === "owner" ? " (owner)" : ""}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const chipStyle = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  paddingHorizontal: 14,
  paddingVertical: 8,
  borderRadius: 20,
  backgroundColor: "#f3f4f6",
  marginRight: 8,
  borderWidth: 1,
  borderColor: "#e5e7eb",
};

const chipActiveStyle = {
  backgroundColor: "#1d4ed8",
  borderColor: "#1d4ed8",
};

const chipText = {
  fontSize: 14 as const,
  color: "#374151",
};

const chipActiveText = {
  color: "#fff",
};
