from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.contrib.auth.models import User
from django.db import transaction

from core.models import Mode
from .models import ModeCollaborator, ModeInvitation
from .serializers import (
    ModeCollaboratorSerializer,
    ModeInvitationSerializer,
    InviteSerializer,
)
from .permissions import accessible_mode_ids


class ModeCollaboratorsView(APIView):
    """
    GET  /api/collaboration/modes/<mode_id>/collaborators/
    List all collaborators + pending invitations for a mode the user owns.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, mode_id):
        mode = Mode.objects.filter(id=mode_id, user=request.user).first()
        if not mode:
            return Response(
                {"detail": "Mode not found or you are not the owner."},
                status=status.HTTP_404_NOT_FOUND,
            )

        collaborators = ModeCollaborator.objects.filter(mode=mode).select_related(
            "user__profile"
        )
        pending_invites = ModeInvitation.objects.filter(
            mode=mode, status="pending"
        ).select_related("invited_by__profile")

        return Response(
            {
                "collaborators": ModeCollaboratorSerializer(
                    collaborators, many=True
                ).data,
                "pendingInvitations": ModeInvitationSerializer(
                    pending_invites, many=True
                ).data,
            }
        )


class InviteToModeView(APIView):
    """
    POST /api/collaboration/modes/<mode_id>/invite/
    Invite a user (by email) to collaborate on a mode.
    Only the mode owner can invite.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, mode_id):
        mode = Mode.objects.filter(id=mode_id, user=request.user).first()
        if not mode:
            return Response(
                {"detail": "Mode not found or you are not the owner."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = InviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"].lower()
        role = serializer.validated_data["role"]

        # Can't invite yourself
        if email == request.user.email.lower():
            return Response(
                {"detail": "You cannot invite yourself."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if user is already a collaborator
        target_user = User.objects.filter(email__iexact=email).first()
        if target_user and ModeCollaborator.objects.filter(
            user=target_user, mode=mode
        ).exists():
            return Response(
                {"detail": "This user is already a collaborator."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check for existing pending invitation
        if ModeInvitation.objects.filter(
            email__iexact=email, mode=mode, status="pending"
        ).exists():
            return Response(
                {"detail": "An invitation is already pending for this email."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        invitation = ModeInvitation.objects.create(
            email=email,
            mode=mode,
            invited_by=request.user,
            role=role,
        )

        return Response(
            ModeInvitationSerializer(invitation).data,
            status=status.HTTP_201_CREATED,
        )


class CancelInvitationView(APIView):
    """
    DELETE /api/collaboration/invitations/<invitation_id>/cancel/
    Cancel a pending invitation. Only the mode owner can cancel.
    """

    permission_classes = [IsAuthenticated]

    def delete(self, request, invitation_id):
        invitation = ModeInvitation.objects.filter(
            id=invitation_id,
            mode__user=request.user,
            status="pending",
        ).first()

        if not invitation:
            return Response(
                {"detail": "Invitation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        invitation.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MyInvitationsView(APIView):
    """
    GET /api/collaboration/invitations/
    List all pending invitations for the current user (matched by email).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        invitations = ModeInvitation.objects.filter(
            email__iexact=request.user.email,
            status="pending",
        ).select_related("mode", "invited_by__profile")

        return Response(
            ModeInvitationSerializer(invitations, many=True).data
        )


class RespondToInvitationView(APIView):
    """
    POST /api/collaboration/invitations/<invitation_id>/respond/
    Accept or decline an invitation.
    Body: { "action": "accept" | "decline" }
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, invitation_id):
        action = request.data.get("action")
        if action not in ("accept", "decline"):
            return Response(
                {"detail": "action must be 'accept' or 'decline'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        invitation = ModeInvitation.objects.filter(
            id=invitation_id,
            email__iexact=request.user.email,
            status="pending",
        ).select_related("mode").first()

        if not invitation:
            return Response(
                {"detail": "Invitation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if action == "accept":
            with transaction.atomic():
                invitation.status = "accepted"
                invitation.save(update_fields=["status"])

                ModeCollaborator.objects.get_or_create(
                    user=request.user,
                    mode=invitation.mode,
                    defaults={"role": invitation.role},
                )
        else:
            invitation.status = "declined"
            invitation.save(update_fields=["status"])

        return Response(ModeInvitationSerializer(invitation).data)


class RemoveCollaboratorView(APIView):
    """
    DELETE /api/collaboration/modes/<mode_id>/collaborators/<collaborator_id>/
    Remove a collaborator from a mode. Only the mode owner can remove.
    """

    permission_classes = [IsAuthenticated]

    def delete(self, request, mode_id, collaborator_id):
        collaborator = ModeCollaborator.objects.filter(
            id=collaborator_id,
            mode_id=mode_id,
            mode__user=request.user,
        ).first()

        if not collaborator:
            return Response(
                {"detail": "Collaborator not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        collaborator.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class LeaveModeView(APIView):
    """
    POST /api/collaboration/modes/<mode_id>/leave/
    A collaborator voluntarily leaves a mode.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, mode_id):
        collaborator = ModeCollaborator.objects.filter(
            user=request.user, mode_id=mode_id
        ).first()

        if not collaborator:
            return Response(
                {"detail": "You are not a collaborator on this mode."},
                status=status.HTTP_404_NOT_FOUND,
            )

        collaborator.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ModeMembersView(APIView):
    """
    GET /api/collaboration/modes/<mode_id>/members/
    Return all users with access to a mode (owner + collaborators).
    Accessible to anyone who has access to the mode.
    Used for the assignee dropdown.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, mode_id):
        mode = Mode.objects.filter(
            id=mode_id, id__in=accessible_mode_ids(request.user)
        ).select_related("user__profile").first()
        if not mode:
            return Response(
                {"detail": "Mode not found or no access."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Build members list: owner first, then collaborators
        def _user_data(user, role):
            profile = getattr(user, "profile", None)
            return {
                "id": user.id,
                "username": user.username,
                "displayName": (profile.display_name if profile and profile.display_name else user.username),
                "avatar": (profile.avatar.url if profile and profile.avatar else None),
                "role": role,
            }

        members = [_user_data(mode.user, "owner")]

        collaborators = ModeCollaborator.objects.filter(
            mode=mode
        ).select_related("user__profile")
        for collab in collaborators:
            members.append(_user_data(collab.user, collab.role))

        return Response({"members": members})
