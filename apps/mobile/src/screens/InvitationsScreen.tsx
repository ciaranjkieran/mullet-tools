import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useMyInvitations } from "@shared/api/hooks/collaboration/useMyInvitations";
import { useRespondToInvitation } from "@shared/api/hooks/collaboration/useRespondToInvitation";
import type { ModeInvitation } from "@shared/types/Collaboration";

function InvitationCard({
  invitation,
  onRespond,
}: {
  invitation: ModeInvitation;
  onRespond: (id: number, action: "accept" | "decline") => void;
}) {
  return (
    <View
      style={{
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: invitation.modeColor,
            justifyContent: "center",
            alignItems: "center",
            marginRight: 12,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
            {invitation.modeTitle.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#111" }}>
            {invitation.modeTitle}
          </Text>
          <Text style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
            Invited by {invitation.invitedBy.profile?.displayName ?? invitation.invitedBy.username}
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 12,
            backgroundColor: invitation.role === "editor" ? "#dbeafe" : "#f3f4f6",
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "500",
              color: invitation.role === "editor" ? "#1d4ed8" : "#6b7280",
              textTransform: "uppercase",
            }}
          >
            {invitation.role}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <TouchableOpacity
          onPress={() => onRespond(invitation.id, "accept")}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 8,
            backgroundColor: "#059669",
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Feather name="check" size={16} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>
            Accept
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onRespond(invitation.id, "decline")}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 8,
            backgroundColor: "#fee2e2",
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Feather name="x" size={16} color="#dc2626" />
          <Text style={{ color: "#dc2626", fontWeight: "600", fontSize: 14 }}>
            Decline
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function InvitationsScreen({ navigation }: any) {
  const { data: invitations = [], isLoading } = useMyInvitations();
  const respondMutation = useRespondToInvitation();

  const handleRespond = (invitationId: number, action: "accept" | "decline") => {
    if (action === "decline") {
      Alert.alert("Decline Invitation", "Are you sure you want to decline?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: () => respondMutation.mutate({ invitationId, action }),
        },
      ]);
    } else {
      respondMutation.mutate({ invitationId, action });
    }
  };

  const pending = invitations.filter((i) => i.status === "pending");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 12,
          backgroundColor: "#fff",
          borderBottomWidth: 1,
          borderBottomColor: "#e5e7eb",
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ marginRight: 12 }}
        >
          <Feather name="arrow-left" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "bold" }}>Invitations</Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={pending}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <InvitationCard invitation={item} onRespond={handleRespond} />
          )}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          ListEmptyComponent={
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                paddingTop: 80,
              }}
            >
              <Feather name="mail" size={40} color="#d1d5db" />
              <Text
                style={{
                  color: "#9ca3af",
                  fontSize: 16,
                  marginTop: 12,
                }}
              >
                No pending invitations
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
