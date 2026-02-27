# notes/views.py
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django.contrib.contenttypes.models import ContentType

from .models import Note
from .serializers import NoteSerializer
from collaboration.permissions import accessible_mode_ids, validate_mode_write_access


class NoteViewSet(viewsets.ModelViewSet):
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Note.objects.filter(mode_id__in=accessible_mode_ids(self.request.user)).select_related("content_type", "user__profile")

        mode_id = self.request.query_params.get("mode_id")
        content_type_str = self.request.query_params.get("content_type")
        object_id = self.request.query_params.get("object_id")

        if mode_id:
            qs = qs.filter(mode_id=mode_id)

        if content_type_str and object_id:
            try:
                ct = ContentType.objects.get(model=content_type_str.lower())
                qs = qs.filter(content_type=ct, object_id=object_id)
            except ContentType.DoesNotExist:
                return Note.objects.none()

        return qs.order_by("created_at")
    
    def perform_create(self, serializer):
        validate_mode_write_access(self.request.user, serializer.validated_data.get("mode"))
        serializer.save(user=self.request.user)

