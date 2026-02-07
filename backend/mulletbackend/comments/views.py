import logging

from rest_framework import viewsets, permissions
from django.contrib.contenttypes.models import ContentType

from .models import Comment, CommentAttachment
from .serializers import CommentSerializer, CommentAttachmentSerializer

logger = logging.getLogger(__name__)


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

        # ✅ create attachments from multipart files
        files = self.request.FILES.getlist("attachments")
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

