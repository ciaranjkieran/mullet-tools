from django.urls import path
from .views import (
    ModeCollaboratorsView,
    InviteToModeView,
    CancelInvitationView,
    MyInvitationsView,
    RespondToInvitationView,
    RemoveCollaboratorView,
    LeaveModeView,
    ModeMembersView,
)

urlpatterns = [
    # Mode-scoped endpoints (owner actions)
    path(
        "modes/<int:mode_id>/collaborators/",
        ModeCollaboratorsView.as_view(),
        name="mode-collaborators",
    ),
    path(
        "modes/<int:mode_id>/invite/",
        InviteToModeView.as_view(),
        name="mode-invite",
    ),
    path(
        "modes/<int:mode_id>/collaborators/<int:collaborator_id>/",
        RemoveCollaboratorView.as_view(),
        name="remove-collaborator",
    ),
    path(
        "modes/<int:mode_id>/leave/",
        LeaveModeView.as_view(),
        name="leave-mode",
    ),
    path(
        "modes/<int:mode_id>/members/",
        ModeMembersView.as_view(),
        name="mode-members",
    ),
    # Invitation endpoints (invitee actions)
    path(
        "invitations/",
        MyInvitationsView.as_view(),
        name="my-invitations",
    ),
    path(
        "invitations/<int:invitation_id>/respond/",
        RespondToInvitationView.as_view(),
        name="respond-invitation",
    ),
    path(
        "invitations/<int:invitation_id>/cancel/",
        CancelInvitationView.as_view(),
        name="cancel-invitation",
    ),
]
