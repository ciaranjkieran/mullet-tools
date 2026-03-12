import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "@shared/api/hooks/auth/useSubscription";
import { useLogout } from "@shared/api/hooks/auth/useLogout";
import { ensureCsrf } from "@shared/api/hooks/auth/ensureCsrf";
import api from "@shared/api/axios";
import { useAuthStore } from "../../lib/store/useAuthStore";
import { useWhiteNavBar } from "../../lib/hooks/useWhiteNavBar";

export default function PaywallOverlay() {
  useWhiteNavBar(true);
  const { isExpired, isLoading } = useSubscription();
  const logout = useLogout();
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const qc = useQueryClient();

  const checkout = useMutation({
    mutationFn: async () => {
      await ensureCsrf();
      const res = await api.post<{ checkoutUrl: string }>(
        "/billing/create-checkout-session/"
      );
      return res.data;
    },
    onSuccess: (data) => {
      Linking.openURL(data.checkoutUrl);
    },
  });

  const handleLogout = async () => {
    await logout.mutateAsync();
    setAuthenticated(false);
  };

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ["me"] });
  };

  const shouldShow = !isLoading && isExpired;
  if (!shouldShow) return null;

  return (
    <Modal visible transparent animationType="fade">
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
            borderRadius: 20,
            padding: 32,
            width: "100%",
            maxWidth: 380,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 22,
              fontWeight: "bold",
              color: "#111",
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Your trial has ended
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: "#6b7280",
              textAlign: "center",
              marginBottom: 28,
              lineHeight: 22,
            }}
          >
            Subscribe to Mullet to keep building with Modes, Goals, Projects, and
            everything you have set up. Your data is safe and waiting.
          </Text>

          <TouchableOpacity
            onPress={() => checkout.mutate()}
            disabled={checkout.isPending}
            style={{
              width: "100%",
              paddingVertical: 14,
              borderRadius: 10,
              backgroundColor: "#1d4ed8",
              alignItems: "center",
              marginBottom: 12,
              opacity: checkout.isPending ? 0.6 : 1,
            }}
          >
            {checkout.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
                Subscribe now
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleRefresh}
            style={{
              width: "100%",
              paddingVertical: 14,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "#d1d5db",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text style={{ color: "#374151", fontWeight: "500", fontSize: 14 }}>
              I already subscribed — refresh
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogout}
            disabled={logout.isPending}
            style={{
              width: "100%",
              paddingVertical: 14,
              borderRadius: 10,
              alignItems: "center",
            }}
          >
            {logout.isPending ? (
              <ActivityIndicator color="#6b7280" />
            ) : (
              <Text style={{ color: "#6b7280", fontWeight: "500", fontSize: 14 }}>
                Log out
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
