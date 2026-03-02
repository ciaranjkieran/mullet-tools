import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useModeCollaborators } from "@shared/api/hooks/collaboration/useModeCollaborators";
import { useInviteToMode } from "@shared/api/hooks/collaboration/useInviteToMode";
import { useRemoveCollaborator } from "@shared/api/hooks/collaboration/useRemoveCollaborator";
import { useCancelInvitation } from "@shared/api/hooks/collaboration/useCancelInvitation";
import { useLeaveMode } from "@shared/api/hooks/collaboration/useLeaveMode";
import type { ModeCollaborator, ModeInvitation } from "@shared/types/Collaboration";

type Props = {
  visible: boolean;
  onClose: () => void;
  modeId: number;
  modeTitle: string;
  modeColor: string;
  isOwner: boolean;
};

function Avatar({
  name,
  color,
  size = 36,
}: {
  name: string;
  color?: string;
  size?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color ?? "#6b7280",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text
        style={{
          color: "#fff",
          fontWeight: "600",
          fontSize: size * 0.4,
        }}
      >
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

function CollaboratorRow({
  collab,
  modeId,
  isOwner,
}: {
  collab: ModeCollaborator;
  modeId: number;
  isOwner: boolean;
}) {
  const removeCollaborator = useRemoveCollaborator();
  const displayName =
    collab.user.profile?.displayName ?? collab.user.username;

  const handleRemove = () => {
    Alert.alert(
      "Remove Collaborator",
      `Remove ${displayName} from this mode?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () =>
            removeCollaborator.mutate({
              modeId,
              collaboratorId: collab.id,
            }),
        },
      ]
    );
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
      }}
    >
      <Avatar name={displayName} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: "500", color: "#111" }}>
          {displayName}
        </Text>
        <Text style={{ fontSize: 12, color: "#9ca3af" }}>
          {collab.user.email}
        </Text>
      </View>
      <View
        style={{
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 12,
          backgroundColor: collab.role === "editor" ? "#dbeafe" : "#f3f4f6",
          marginRight: isOwner ? 8 : 0,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: "500",
            color: collab.role === "editor" ? "#1d4ed8" : "#6b7280",
            textTransform: "uppercase",
          }}
        >
          {collab.role}
        </Text>
      </View>
      {isOwner && (
        <TouchableOpacity
          onPress={handleRemove}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="trash-2" size={16} color="#dc2626" />
        </TouchableOpacity>
      )}
    </View>
  );
}

function PendingInvitationRow({
  invitation,
  modeId,
  isOwner,
}: {
  invitation: ModeInvitation;
  modeId: number;
  isOwner: boolean;
}) {
  const cancelInvitation = useCancelInvitation();

  const handleCancel = () => {
    Alert.alert("Cancel Invitation", `Cancel invitation to ${invitation.email}?`, [
      { text: "Keep", style: "cancel" },
      {
        text: "Cancel Invitation",
        style: "destructive",
        onPress: () =>
          cancelInvitation.mutate({
            invitationId: invitation.id,
            modeId,
          }),
      },
    ]);
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: "#f3f4f6",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Feather name="mail" size={16} color="#9ca3af" />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontSize: 15, color: "#6b7280" }}>
          {invitation.email}
        </Text>
        <Text style={{ fontSize: 12, color: "#d1d5db" }}>Pending</Text>
      </View>
      <View
        style={{
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 12,
          backgroundColor: "#fef3c7",
          marginRight: isOwner ? 8 : 0,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: "500",
            color: "#92400e",
            textTransform: "uppercase",
          }}
        >
          {invitation.role}
        </Text>
      </View>
      {isOwner && (
        <TouchableOpacity
          onPress={handleCancel}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="x" size={16} color="#dc2626" />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function ModeCollaborationModal({
  visible,
  onClose,
  modeId,
  modeTitle,
  modeColor,
  isOwner,
}: Props) {
  const { data, isLoading } = useModeCollaborators(visible ? modeId : null);
  const inviteToMode = useInviteToMode();
  const leaveMode = useLeaveMode();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");

  const collaborators = data?.collaborators ?? [];
  const pendingInvitations = data?.pendingInvitations ?? [];

  const handleInvite = async () => {
    if (!email.trim()) return;
    try {
      await inviteToMode.mutateAsync({
        modeId,
        email: email.trim().toLowerCase(),
        role,
      });
      setEmail("");
    } catch (err: any) {
      Alert.alert(
        "Invite Failed",
        err?.response?.data?.detail ?? "Could not send invitation."
      );
    }
  };

  const handleLeave = () => {
    Alert.alert(
      "Leave Mode",
      `Leave "${modeTitle}"? You will lose access to this mode.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            await leaveMode.mutateAsync({ modeId });
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: "#fff" }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 2,
            borderBottomColor: modeColor,
          }}
        >
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: "#6b7280", fontSize: 16 }}>Close</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: "600" }}>
            {modeTitle}
          </Text>
          <View style={{ width: 50 }} />
        </View>

        {isLoading ? (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Invite form — owner only */}
            {isOwner && (
              <View style={{ marginBottom: 24 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: "#374151",
                    marginBottom: 8,
                  }}
                >
                  Invite Collaborator
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email address"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: "#d1d5db",
                      borderRadius: 10,
                      padding: 12,
                      fontSize: 15,
                    }}
                  />
                  <TouchableOpacity
                    onPress={handleInvite}
                    disabled={inviteToMode.isPending || !email.trim()}
                    style={{
                      paddingHorizontal: 16,
                      justifyContent: "center",
                      borderRadius: 10,
                      backgroundColor:
                        email.trim() ? modeColor : "#e5e7eb",
                    }}
                  >
                    {inviteToMode.isPending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Feather name="send" size={18} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Role toggle */}
                <View
                  style={{
                    flexDirection: "row",
                    marginTop: 8,
                    backgroundColor: "#f3f4f6",
                    borderRadius: 8,
                    padding: 2,
                    alignSelf: "flex-start",
                  }}
                >
                  {(["editor", "viewer"] as const).map((r) => (
                    <TouchableOpacity
                      key={r}
                      onPress={() => setRole(r)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 6,
                        borderRadius: 6,
                        backgroundColor:
                          role === r ? "#fff" : "transparent",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: role === r ? "600" : "400",
                          color: role === r ? "#111" : "#6b7280",
                        }}
                      >
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Collaborators list */}
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#374151",
                marginBottom: 8,
              }}
            >
              Collaborators
              {collaborators.length > 0 &&
                ` (${collaborators.length})`}
            </Text>

            {collaborators.length === 0 && pendingInvitations.length === 0 ? (
              <View
                style={{
                  alignItems: "center",
                  paddingVertical: 24,
                }}
              >
                <Feather name="users" size={28} color="#d1d5db" />
                <Text
                  style={{
                    color: "#9ca3af",
                    marginTop: 8,
                    fontSize: 14,
                  }}
                >
                  No collaborators yet
                </Text>
              </View>
            ) : (
              <>
                {collaborators.map((c) => (
                  <CollaboratorRow
                    key={c.id}
                    collab={c}
                    modeId={modeId}
                    isOwner={isOwner}
                  />
                ))}

                {pendingInvitations.length > 0 && (
                  <>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: "#9ca3af",
                        marginTop: 16,
                        marginBottom: 8,
                      }}
                    >
                      Pending Invitations
                    </Text>
                    {pendingInvitations.map((inv) => (
                      <PendingInvitationRow
                        key={inv.id}
                        invitation={inv}
                        modeId={modeId}
                        isOwner={isOwner}
                      />
                    ))}
                  </>
                )}
              </>
            )}

            {/* Leave mode — collaborators only */}
            {!isOwner && (
              <TouchableOpacity
                onPress={handleLeave}
                disabled={leaveMode.isPending}
                style={{
                  marginTop: 32,
                  paddingVertical: 14,
                  borderRadius: 10,
                  backgroundColor: "#fee2e2",
                  alignItems: "center",
                }}
              >
                {leaveMode.isPending ? (
                  <ActivityIndicator color="#dc2626" />
                ) : (
                  <Text
                    style={{
                      color: "#dc2626",
                      fontWeight: "600",
                      fontSize: 16,
                    }}
                  >
                    Leave Mode
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}
