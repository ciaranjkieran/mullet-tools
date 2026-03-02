import React from "react";
import { View, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNetInfo } from "@react-native-community/netinfo";

export default function OfflineBanner() {
  const netInfo = useNetInfo();

  // Don't show while still determining connectivity
  if (netInfo.isConnected === null) return null;
  if (netInfo.isConnected) return null;

  return (
    <View
      style={{
        backgroundColor: "#fef3c7",
        paddingHorizontal: 16,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#fcd34d",
      }}
    >
      <Feather name="wifi-off" size={16} color="#92400e" />
      <Text
        style={{
          marginLeft: 8,
          fontSize: 13,
          fontWeight: "500",
          color: "#92400e",
        }}
      >
        You're offline. Some features may not work.
      </Text>
    </View>
  );
}
