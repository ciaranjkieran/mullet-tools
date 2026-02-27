import uuid
from django.db import models
from django.conf import settings


class ModeCollaborator(models.Model):
    """
    Links a user to a Mode they've been invited to collaborate on.
    The Mode owner is NOT stored here — ownership is determined by Mode.user.
    """

    ROLE_CHOICES = [
        ("editor", "Editor"),
        ("viewer", "Viewer"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="mode_collaborations",
    )
    mode = models.ForeignKey(
        "core.Mode",
        on_delete=models.CASCADE,
        related_name="collaborators",
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default="editor")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "mode")
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.user.username} → {self.mode.title} ({self.role})"


class ModeInvitation(models.Model):
    """
    A pending invitation to collaborate on a Mode.
    Identified by email so we can invite users who haven't registered yet.
    """

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("declined", "Declined"),
    ]

    ROLE_CHOICES = ModeCollaborator.ROLE_CHOICES

    email = models.EmailField()
    mode = models.ForeignKey(
        "core.Mode",
        on_delete=models.CASCADE,
        related_name="invitations",
    )
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_invitations",
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default="editor")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="pending")
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        # Prevent duplicate pending invitations for the same email + mode
        constraints = [
            models.UniqueConstraint(
                fields=["email", "mode"],
                condition=models.Q(status="pending"),
                name="unique_pending_invitation_per_email_mode",
            ),
        ]

    def __str__(self):
        return f"Invite {self.email} → {self.mode.title} ({self.status})"
