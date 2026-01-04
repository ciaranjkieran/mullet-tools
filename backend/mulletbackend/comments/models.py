# comments/models.py
import os
import mimetypes
from uuid import uuid4

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models


class Comment(models.Model):
    mode = models.ForeignKey(
        "core.Mode",
        on_delete=models.CASCADE,
        related_name="comments",
    )

    # Generic relation (nullable = easier PATCH + safer migrations)
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    object_id = models.PositiveIntegerField(null=True, blank=True)
    content_object = GenericForeignKey("content_type", "object_id")

    body = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_deleted = models.BooleanField(default=False)

    # ✅ required: every Comment belongs to a user (safe for friends beta)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="comments",
    )

    class Meta:
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["user", "mode", "created_at"]),
            models.Index(fields=["content_type", "object_id"]),
            models.Index(fields=["is_deleted"]),
        ]

    def __str__(self):
        return (self.body or "")[:30]

    def delete(self, *args, **kwargs):
        # Ensure attachments are deleted via instance.delete() so file cleanup runs
        for attachment in list(self.attachments.all()):
            attachment.delete()
        super().delete(*args, **kwargs)


def attachment_upload_to(instance, filename):
    ext = os.path.splitext(filename)[1]
    return f"comment_attachments/{uuid4().hex}{ext}"


class CommentAttachment(models.Model):
    comment = models.ForeignKey(
        Comment,
        related_name="attachments",
        on_delete=models.CASCADE,
    )
    file = models.FileField(upload_to=attachment_upload_to)

    original_name = models.CharField(max_length=255, blank=True, default="")
    mime = models.CharField(max_length=100, blank=True, default="")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    # ✅ required: every attachment belongs to a user
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="comment_attachments",
    )

    class Meta:
        indexes = [
            models.Index(fields=["user", "uploaded_at"]),
            models.Index(fields=["comment", "uploaded_at"]),
        ]

    def save(self, *args, **kwargs):
        if not self.original_name:
            self.original_name = os.path.basename(getattr(self.file, "name", "") or "")
        if not self.mime:
            guess, _ = mimetypes.guess_type(self.original_name or self.file.name or "")
            self.mime = guess or "application/octet-stream"
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        storage = self.file.storage
        name = self.file.name
        super().delete(*args, **kwargs)
        if name:
            storage.delete(name)

    def __str__(self):
        return self.original_name or self.file.name
