# boards/views.py
import logging
import os

from django.conf import settings

logger = logging.getLogger(__name__)
from django.contrib.contenttypes.models import ContentType
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Pin
from .serializers import PinSerializer
from .linkmeta import fetch_link_meta, try_fetch_favicon_url


class PinViewSet(viewsets.ModelViewSet):
    serializer_class = PinSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ["title", "description", "entity_title", "url"]

    def get_queryset(self):
        qs = (
            Pin.objects.filter(user=self.request.user)
            .select_related("content_type", "mode")
            # prefetch_related("content_object") is not valid for GenericForeignKey;
            # leaving it out avoids confusion.
        )

        mode_id = self.request.query_params.get("mode")
        entity_type = self.request.query_params.get("entity_type")
        entity_id = self.request.query_params.get("entity_id")
        kind = self.request.query_params.get("kind")

        if mode_id:
            qs = qs.filter(mode_id=mode_id)
        if kind:
            qs = qs.filter(kind=kind)

        if entity_type and entity_id:
            try:
                ct = ContentType.objects.get(model=entity_type.lower())
                qs = qs.filter(content_type=ct, object_id=entity_id)
            except ContentType.DoesNotExist:
                return Pin.objects.none()

        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        pin = serializer.save(user=self.request.user)

        # --- DEBUG LOGS ---
        logger.debug("MEDIA_ROOT: %s", settings.MEDIA_ROOT)
        if pin.file:
            logger.debug("Saved file name: %s", pin.file.name)
            try:
                logger.debug("Saved file path: %s", pin.file.path)
                logger.debug("File exists: %s", os.path.exists(pin.file.path))
            except Exception as e:
                # Some storages (S3) don't have .path
                logger.debug("Could not resolve file path: %s", repr(e))
        else:
            logger.debug("No file attached to this pin.")
        # ---------------

        return pin

    @action(detail=True, methods=["post"])
    def refresh_meta(self, request, pk=None):
        pin = self.get_object()
        if pin.kind != "link" or not pin.url:
            return Response({"ok": False, "reason": "not a link"}, status=400)

        meta = fetch_link_meta(pin.url)
        updated = False

        if meta.get("title") and not pin.title:
            pin.title = meta["title"]
            updated = True
        if meta.get("description") and not pin.description:
            pin.description = meta["description"]
            updated = True

        img = meta.get("image") or try_fetch_favicon_url(pin.url)
        if img:
            try:
                serializer = self.get_serializer(instance=pin)
                serializer._download_to_thumbnail(pin, img)
                updated = True
            except Exception:
                pass

        if updated:
            pin.save()

        return Response({"ok": True, "updated": updated})
