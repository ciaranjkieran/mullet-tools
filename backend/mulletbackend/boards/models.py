# boards/models.py
from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.conf import settings


class Pin(models.Model):
    KIND_CHOICES = [
        ("image", "image"),
        ("link", "link"),
        ("video", "video"),
        ("file", "file"),
    ]

    kind = models.CharField(max_length=16, choices=KIND_CHOICES, default="image")
    title = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)

    file = models.FileField(upload_to="pins/", blank=True, null=True)
    thumbnail = models.ImageField(upload_to="pins/thumbs/", blank=True, null=True)
    url = models.URLField(blank=True)

    mime_type = models.CharField(max_length=128, blank=True)
    file_size = models.PositiveIntegerField(default=0)

    mode = models.ForeignKey("core.Mode", on_delete=models.CASCADE, related_name="pins")

    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    object_id = models.PositiveIntegerField(null=True, blank=True)
    content_object = GenericForeignKey("content_type", "object_id")
    entity_title = models.CharField(max_length=255, blank=True, default="")

    is_board_item = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # ✅ required: every Pin belongs to a user (safe for multi-user / friends beta)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="pins",
    )

    class Meta:
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["user", "kind"]),
            models.Index(fields=["kind"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["mode", "created_at"]),
        ]

    def __str__(self) -> str:
        return self.title or f"Pin {self.pk}"
