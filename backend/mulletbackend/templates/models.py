# templates/models.py
from django.db import models
from django.conf import settings


class Template(models.Model):
    TEMPLATE_TYPE_CHOICES = [
        ("milestone", "Milestone"),
        ("project", "Project"),
    ]

    title = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=TEMPLATE_TYPE_CHOICES)

    mode = models.ForeignKey(
        "core.Mode",
        on_delete=models.CASCADE,
        related_name="templates",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    tags = models.JSONField(blank=True, default=list)
    data = models.JSONField()
    is_public = models.BooleanField(default=False)

    # ✅ required: every Template belongs to a user
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="templates",
    )

    class Meta:
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["user", "mode", "created_at"]),
            models.Index(fields=["type"]),
            models.Index(fields=["is_public"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return self.title
