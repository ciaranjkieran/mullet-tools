import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWhiteNavBar } from "../../lib/hooks/useWhiteNavBar";
import { Feather } from "@expo/vector-icons";
import { textLine } from "../../lib/styles/platform";

type Option = { id: number; title: string };

type Props = {
  label: string;
  options: Option[];
  selectedId: number | null;
  onChange: (id: number | null) => void;
  icon?: React.ComponentProps<typeof Feather>["name"];
  iconElement?: React.ReactNode;
  modeColor?: string;
  /** When true, options are rendered in the order provided (no alphabetical sort). */
  preserveOrder?: boolean;
};

export default function DropdownPicker({
  label,
  options,
  selectedId,
  onChange,
  icon,
  iconElement,
  modeColor,
  preserveOrder,
}: Props) {
  const [open, setOpen] = useState(false);
  useWhiteNavBar(open);
  const insets = useSafeAreaInsets();

  const sorted = preserveOrder
    ? options
    : [...options].sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" })
      );

  const selected = sorted.find((o) => o.id === selectedId);

  const pick = (id: number | null) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <View style={{ marginTop: 16 }}>
      {/* Label */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6, gap: 6 }}>
        {iconElement ?? (icon && (
          <Feather name={icon} size={14} color={modeColor ?? "#6b7280"} />
        ))}
        <Text style={{ ...textLine(13), fontWeight: "600", color: "#374151" }}>
          {label}
        </Text>
      </View>

      {/* Trigger */}
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderWidth: 1,
          borderColor: "#d1d5db",
          borderRadius: 10,
          padding: 12,
          backgroundColor: "#fff",
        }}
      >
        <Text
          style={{
            ...textLine(16),
            color: selected ? "#111" : "#9ca3af",
            flex: 1,
          }}
          numberOfLines={1}
        >
          {selected ? selected.title : "None"}
        </Text>
        <Feather name="chevron-down" size={18} color="#6b7280" />
      </TouchableOpacity>

      {/* Dropdown modal */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
          onPress={() => setOpen(false)}
        >
          <Pressable
            style={{
              backgroundColor: "#fff",
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: "60%",
              paddingBottom: Math.max(insets.bottom, 16),
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: "#e5e7eb",
              }}
            >
              <Text style={{ ...textLine(17), fontWeight: "600" }}>
                {label}
              </Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Feather name="x" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Options */}
            <FlatList
              data={[{ id: null as number | null, title: "None" }, ...sorted]}
              keyExtractor={(item) => String(item.id ?? "none")}
              renderItem={({ item }) => {
                const isActive = item.id === selectedId;
                return (
                  <TouchableOpacity
                    onPress={() => pick(item.id)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      backgroundColor: isActive ? "#eff6ff" : "#fff",
                      borderBottomWidth: 1,
                      borderBottomColor: "#f3f4f6",
                    }}
                  >
                    <Text
                      style={{
                        flex: 1,
                        ...textLine(16),
                        color: isActive ? "#1d4ed8" : "#111",
                        fontWeight: isActive ? "600" : "400",
                      }}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    {isActive && (
                      <Feather name="check" size={18} color="#1d4ed8" />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
