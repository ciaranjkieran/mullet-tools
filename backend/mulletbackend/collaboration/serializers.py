from rest_framework import serializers
from django.contrib.auth.models import User
from accounts.serializers import ProfileSerializer
from .models import ModeCollaborator, ModeInvitation


class CollaboratorUserSerializer(serializers.ModelSerializer):
    """Lightweight user representation for collaborator lists."""

    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "profile"]


class ModeCollaboratorSerializer(serializers.ModelSerializer):
    user = CollaboratorUserSerializer(read_only=True)

    class Meta:
        model = ModeCollaborator
        fields = ["id", "user", "role", "created_at"]
        read_only_fields = ["id", "created_at"]


class ModeInvitationSerializer(serializers.ModelSerializer):
    invitedBy = CollaboratorUserSerializer(source="invited_by", read_only=True)
    modeTitle = serializers.CharField(source="mode.title", read_only=True)
    modeColor = serializers.CharField(source="mode.color", read_only=True)
    modeId = serializers.IntegerField(source="mode.id", read_only=True)

    class Meta:
        model = ModeInvitation
        fields = [
            "id",
            "email",
            "role",
            "status",
            "modeTitle",
            "modeColor",
            "modeId",
            "invitedBy",
            "created_at",
        ]
        read_only_fields = ["id", "status", "created_at"]


class InviteSerializer(serializers.Serializer):
    """Validates the invite request payload."""

    email = serializers.EmailField()
    role = serializers.ChoiceField(
        choices=ModeCollaborator.ROLE_CHOICES, default="editor"
    )
