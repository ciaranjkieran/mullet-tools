# notes/models.py
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.conf import settings


class Note(models.Model):
    body = models.TextField()

    mode = models.ForeignKey(
        "core.Mode",
        on_delete=models.CASCADE,
        related_name="notes",
    )

    # Generic relation (nullable so PATCH doesn't require resending it)
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    object_id = models.PositiveIntegerField(null=True, blank=True)
    content_object = GenericForeignKey("content_type", "object_id")

    entity_title = models.CharField(max_length=255, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    # ✅ required: every Note belongs to a user (safe for friends beta)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notes",
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["user", "mode", "created_at"]),
            models.Index(fields=["content_type", "object_id"]),
        ]

    def __str__(self) -> str:
        return f"Note {self.pk}"
