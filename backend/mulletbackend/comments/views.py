import logging
import os

from rest_framework import viewsets, permissions
from rest_framework.exceptions import ValidationError
from django.contrib.contenttypes.models import ContentType

from .models import Comment, CommentAttachment
from .serializers import CommentSerializer, CommentAttachmentSerializer
from boards.validation import ALLOWED_FILE_MIMES, ALLOWED_FILE_EXTS, MAX_FILE_BYTES

logger = logging.getLogger(__name__)

COMMENT_ALLOWED_IMAGE_MIMES = {"image/png", "image/jpeg", "image/gif", "image/webp"}
COMMENT_ALLOWED_MIMES = ALLOWED_FILE_MIMES | COMMENT_ALLOWED_IMAGE_MIMES
COMMENT_ALLOWED_EXTS = ALLOWED_FILE_EXTS | {"png", "jpg", "jpeg", "gif", "webp"}


def _validate_attachment(f):
    ext = os.path.splitext(f.name or "")[1].lstrip(".").lower()
    if ext not in COMMENT_ALLOWED_EXTS:
        raise ValidationError(f"File type '.{ext}' is not allowed.")
    mime = getattr(f, "content_type", "") or ""
    if mime not in COMMENT_ALLOWED_MIMES:
        raise ValidationError(f"MIME type '{mime}' is not allowed.")
    if f.size > MAX_FILE_BYTES:
        raise ValidationError(
            f"File too large ({f.size} bytes). Max is {MAX_FILE_BYTES} bytes."
        )


class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, *args, **kwargs):
        logger.info(
            "CommentViewSet.list called — user=%s params=%s",
            request.user.id if request.user.is_authenticated else "anon",
            dict(request.query_params),
        )
        try:
            response = super().list(request, *args, **kwargs)
            logger.info("CommentViewSet.list returning %d items", len(response.data))
            return response
        except Exception:
            logger.exception("CommentViewSet.list failed")
            raise

    def get_queryset(self):
        qs = (
            Comment.objects
            .filter(user=self.request.user, is_deleted=False)
            .select_related("content_type", "mode")
            .prefetch_related("attachments")
        )

        mode_id = self.request.query_params.get("mode")
        entity_type = self.request.query_params.get("entity")
        entity_id = self.request.query_params.get("entity_id")

        if mode_id:
            try:
                qs = qs.filter(mode_id=int(mode_id))
            except (ValueError, TypeError):
                pass

        if entity_type and entity_id:
            try:
                ct = ContentType.objects.get(model=entity_type.lower())
                qs = qs.filter(content_type=ct, object_id=entity_id)
            except ContentType.DoesNotExist:
                return Comment.objects.none()

        return qs.order_by("created_at")

    def perform_create(self, serializer):
        comment = serializer.save(user=self.request.user)

        files = self.request.FILES.getlist("attachments")
        for f in files:
            _validate_attachment(f)
        for f in files:
            CommentAttachment.objects.create(
                comment=comment,
                user=self.request.user,
                file=f,
                original_name=getattr(f, "name", "") or "",
                mime=getattr(f, "content_type", "") or "",
            )



class CommentAttachmentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentAttachmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only attachments owned by this user
        return CommentAttachment.objects.filter(user=self.request.user).select_related("comment")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

