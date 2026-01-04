# comments/views.py
from rest_framework import viewsets, permissions
from django.contrib.contenttypes.models import ContentType

from .models import Comment, CommentAttachment
from .serializers import CommentSerializer, CommentAttachmentSerializer


class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Comment.objects.filter(user=self.request.user, is_deleted=False)

        mode_id = self.request.query_params.get("mode")
        entity_type = self.request.query_params.get("entity")
        entity_id = self.request.query_params.get("entity_id")

        if mode_id:
            qs = qs.filter(mode_id=mode_id)

        if entity_type and entity_id:
            try:
                ct = ContentType.objects.get(model=entity_type.lower())
                qs = qs.filter(content_type=ct, object_id=entity_id)
            except ContentType.DoesNotExist:
                return Comment.objects.none()

        return qs.order_by("created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CommentAttachmentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentAttachmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only attachments owned by this user
        return CommentAttachment.objects.filter(user=self.request.user).select_related("comment")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

