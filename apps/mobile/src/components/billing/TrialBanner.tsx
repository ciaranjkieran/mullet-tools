import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Linking } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { useSubscription } from "@shared/api/hooks/auth/useSubscription";
import { ensureCsrf } from "@shared/api/hooks/auth/ensureCsrf";
import api from "@shared/api/axios";

export default function TrialBanner() {
  const { isTrialing, trialDaysRemaining, isActive } = useSubscription();

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

  if (!isTrialing || !isActive) return null;

  const urgency = trialDaysRemaining <= 3;

  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: urgency ? "#fff7ed" : "#eff6ff",
        borderBottomWidth: 1,
        borderBottomColor: urgency ? "#fed7aa" : "#bfdbfe",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Text
        style={{
          flex: 1,
          fontSize: 13,
          fontWeight: "500",
          color: urgency ? "#9a3412" : "#1e40af",
        }}
      >
        {trialDaysRemaining === 0
          ? "Your free trial ends today."
          : `${trialDaysRemaining} day${trialDaysRemaining === 1 ? "" : "s"} left in your free trial.`}
      </Text>
      <TouchableOpacity
        onPress={() => checkout.mutate()}
        disabled={checkout.isPending}
        style={{
          marginLeft: 12,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 6,
          backgroundColor: urgency ? "#ea580c" : "#2563eb",
        }}
      >
        {checkout.isPending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
            Subscribe
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
