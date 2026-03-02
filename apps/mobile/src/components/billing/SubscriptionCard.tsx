import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "@shared/api/hooks/auth/useSubscription";
import { useCancelSubscription } from "@shared/api/hooks/billing/useCancelSubscription";
import { useResumeSubscription } from "@shared/api/hooks/billing/useResumeSubscription";
import { ensureCsrf } from "@shared/api/hooks/auth/ensureCsrf";
import api from "@shared/api/axios";
import { format } from "date-fns";

export default function SubscriptionCard() {
  const {
    subscription,
    isActive,
    isTrialing,
    isCancelled,
    trialDaysRemaining,
    isLoading,
  } = useSubscription();
  const cancel = useCancelSubscription();
  const resume = useResumeSubscription();
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

  if (isLoading || !subscription) return null;

  const handleCancel = () => {
    Alert.alert(
      "Cancel Subscription",
      "You'll keep access until the end of your billing period. Are you sure?",
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Cancel",
          style: "destructive",
          onPress: () => cancel.mutate(),
        },
      ]
    );
  };

  const handleResume = () => {
    resume.mutate();
  };

  const statusLabel = isTrialing
    ? "Free Trial"
    : subscription.status === "active"
      ? "Active"
      : subscription.status === "cancelled"
        ? "Cancelled"
        : "Expired";

  const statusColor = isTrialing
    ? "#2563eb"
    : subscription.status === "active"
      ? "#16a34a"
      : subscription.status === "cancelled"
        ? "#ea580c"
        : "#dc2626";

  return (
    <View
      style={{
        backgroundColor: "#f9fafb",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        padding: 16,
        marginBottom: 20,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "600", color: "#111" }}>
          Subscription
        </Text>
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 12,
            backgroundColor: statusColor + "18",
          }}
        >
          <Text
            style={{ fontSize: 12, fontWeight: "600", color: statusColor }}
          >
            {statusLabel}
          </Text>
        </View>
      </View>

      {isTrialing && (
        <Text style={{ fontSize: 14, color: "#6b7280", marginBottom: 12 }}>
          {trialDaysRemaining === 0
            ? "Your trial ends today."
            : `${trialDaysRemaining} day${trialDaysRemaining === 1 ? "" : "s"} remaining in your trial.`}
        </Text>
      )}

      {subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd && (
        <Text style={{ fontSize: 14, color: "#ea580c", marginBottom: 12 }}>
          Access until{" "}
          {format(new Date(subscription.currentPeriodEnd), "MMM d, yyyy")}
        </Text>
      )}

      {subscription.status === "active" && !subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd && (
        <Text style={{ fontSize: 14, color: "#6b7280", marginBottom: 12 }}>
          Renews{" "}
          {format(new Date(subscription.currentPeriodEnd), "MMM d, yyyy")}
        </Text>
      )}

      {/* Actions */}
      {isTrialing && (
        <TouchableOpacity
          onPress={() => checkout.mutate()}
          disabled={checkout.isPending}
          style={{
            paddingVertical: 12,
            borderRadius: 8,
            backgroundColor: "#1d4ed8",
            alignItems: "center",
            opacity: checkout.isPending ? 0.6 : 1,
          }}
        >
          {checkout.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>
              Subscribe now
            </Text>
          )}
        </TouchableOpacity>
      )}

      {subscription.status === "active" && !subscription.cancelAtPeriodEnd && (
        <TouchableOpacity
          onPress={handleCancel}
          disabled={cancel.isPending}
          style={{
            paddingVertical: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: "#d1d5db",
            alignItems: "center",
            opacity: cancel.isPending ? 0.6 : 1,
          }}
        >
          {cancel.isPending ? (
            <ActivityIndicator color="#6b7280" />
          ) : (
            <Text style={{ color: "#6b7280", fontWeight: "500", fontSize: 14 }}>
              Cancel subscription
            </Text>
          )}
        </TouchableOpacity>
      )}

      {subscription.cancelAtPeriodEnd && (
        <TouchableOpacity
          onPress={handleResume}
          disabled={resume.isPending}
          style={{
            paddingVertical: 12,
            borderRadius: 8,
            backgroundColor: "#16a34a",
            alignItems: "center",
            opacity: resume.isPending ? 0.6 : 1,
          }}
        >
          {resume.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>
              Resume subscription
            </Text>
          )}
        </TouchableOpacity>
      )}

      {!isActive && subscription.status === "expired" && (
        <TouchableOpacity
          onPress={() => checkout.mutate()}
          disabled={checkout.isPending}
          style={{
            paddingVertical: 12,
            borderRadius: 8,
            backgroundColor: "#1d4ed8",
            alignItems: "center",
            opacity: checkout.isPending ? 0.6 : 1,
          }}
        >
          {checkout.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>
              Resubscribe
            </Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
