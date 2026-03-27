import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useLogout } from "@shared/api/hooks/auth/useLogout";
import { useDeleteAccount } from "@shared/api/hooks/auth/useDeleteAccount";
import { useMyInvitations } from "@shared/api/hooks/collaboration/useMyInvitations";
import { useAuthStore } from "../lib/store/useAuthStore";
import EditModesModal from "../components/modes/EditModesModal";
import SubscriptionCard from "../components/billing/SubscriptionCard";

type SettingsRow = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  badge?: number;
};

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const logout = useLogout();
  const deleteAccount = useDeleteAccount();
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const { data: invitations = [] } = useMyInvitations();
  const pendingCount = invitations.filter((i) => i.status === "pending").length;
  const [editModesOpen, setEditModesOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
    } catch {
      // Session may already be expired — still clear auth state
    }
    setAuthenticated(false);
  };

  const rows: SettingsRow[] = [
    {
      icon: "mail",
      label: "Invitations",
      onPress: () => navigation.navigate("Invitations"),
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      icon: "sliders",
      label: "Edit Modes",
      onPress: () => setEditModesOpen(true),
    },
    {
      icon: "search",
      label: "Search",
      onPress: () => navigation.navigate("Search"),
    },
    {
      icon: "layers",
      label: "Templates",
      onPress: () => navigation.navigate("Templates"),
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top", "left", "right"]}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: "bold" }}>Settings</Text>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 24 }}>
        <SubscriptionCard />

        {rows.map((row) => (
          <TouchableOpacity
            key={row.label}
            onPress={row.onPress}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderRadius: 10,
              backgroundColor: "#f9fafb",
              borderWidth: 1,
              borderColor: "#e5e7eb",
              marginBottom: 12,
            }}
          >
            <Feather name={row.icon} size={20} color="#374151" />
            <Text
              style={{
                flex: 1,
                marginLeft: 12,
                fontSize: 16,
                fontWeight: "500",
                color: "#111",
              }}
            >
              {row.label}
            </Text>
            {row.badge != null && (
              <View
                style={{
                  minWidth: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: "#dc2626",
                  justifyContent: "center",
                  alignItems: "center",
                  paddingHorizontal: 6,
                  marginRight: 8,
                }}
              >
                <Text
                  style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}
                >
                  {row.badge}
                </Text>
              </View>
            )}
            <Feather name="chevron-right" size={18} color="#9ca3af" />
          </TouchableOpacity>
        ))}

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Delete Account */}
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              "Delete Account",
              "This will permanently delete your account and all data. This cannot be undone.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Continue",
                  style: "destructive",
                  onPress: () => {
                    setDeletePassword("");
                    setDeleteError("");
                    setShowDeleteModal(true);
                  },
                },
              ]
            );
          }}
          style={{
            paddingVertical: 14,
            paddingHorizontal: 20,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "#fecaca",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Text style={{ color: "#dc2626", fontWeight: "500", fontSize: 14 }}>
            Delete account
          </Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          disabled={logout.isPending}
          style={{
            paddingVertical: 14,
            paddingHorizontal: 20,
            borderRadius: 10,
            backgroundColor: "#fee2e2",
            alignItems: "center",
            marginBottom: 32,
          }}
        >
          {logout.isPending ? (
            <ActivityIndicator color="#dc2626" />
          ) : (
            <Text style={{ color: "#dc2626", fontWeight: "600", fontSize: 16 }}>
              Log out
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <EditModesModal
        visible={editModesOpen}
        onClose={() => setEditModesOpen(false)}
      />

      {/* Delete Account Confirmation Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 24,
              width: "100%",
              maxWidth: 360,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: "#dc2626",
                marginBottom: 8,
              }}
            >
              Confirm deletion
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#6b7280",
                marginBottom: 20,
                lineHeight: 20,
              }}
            >
              Enter your password to permanently delete your account. All data
              will be lost and any active subscription will be cancelled.
            </Text>

            <TextInput
              placeholder="Password"
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
              autoComplete="current-password"
              style={{
                borderWidth: 1,
                borderColor: "#d1d5db",
                borderRadius: 8,
                padding: 12,
                fontSize: 15,
                marginBottom: 8,
              }}
            />

            {deleteError ? (
              <Text
                style={{ color: "#dc2626", fontSize: 13, marginBottom: 8 }}
              >
                {deleteError}
              </Text>
            ) : null}

            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: 12,
                marginTop: 12,
              }}
            >
              <TouchableOpacity
                onPress={() => setShowDeleteModal(false)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "#d1d5db",
                }}
              >
                <Text style={{ color: "#374151", fontWeight: "500" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={!deletePassword || deleteAccount.isPending}
                onPress={async () => {
                  setDeleteError("");
                  try {
                    await deleteAccount.mutateAsync(deletePassword);
                    setShowDeleteModal(false);
                    setAuthenticated(false);
                  } catch (err: any) {
                    setDeleteError(
                      err?.response?.data?.detail ?? "Failed to delete account."
                    );
                  }
                }}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  backgroundColor: deletePassword ? "#dc2626" : "#d1d5db",
                }}
              >
                {deleteAccount.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "600" }}>
                    Delete
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
