# boards/serializers.py
from mimetypes import guess_type

from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType

from .models import Pin
from .linkmeta import fetch_link_meta, try_fetch_favicon_url

# ✅ NEW: local thumbnail generators (Pillow + PyMuPDF)
# (Create this file: boards/thumbs.py from the previous message)
from .thumbs import make_image_thumb, make_pdf_thumb

# boards/serializers.py
from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from .models import Pin

def _extract_title(obj):
    for attr in ("title", "name", "label"):
        v = getattr(obj, attr, None)
        if v:
            return v
    return None

class PinSerializer(serializers.ModelSerializer):
    entity = serializers.CharField(write_only=True)
    entity_id = serializers.IntegerField(write_only=True)

    display_title = serializers.SerializerMethodField()

    class Meta:
        model = Pin
        fields = [
            "id",
            "kind",
            "file",
            "thumbnail",
            "url",
            "title",
            "description",
            "mode",
            "entity",
            "entity_id",
            "content_type",
            "object_id",
            "entity_title",
            "display_title",   # ✅ add
            "mime_type",
            "file_size",
            "is_board_item",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "thumbnail",
            "content_type",
            "object_id",
            "entity_title",
            "display_title",   # ✅ add
            "mime_type",
            "file_size",
        ]

    def get_display_title(self, obj):
        target = getattr(obj, "content_object", None)
        live = _extract_title(target) if target else None
        return live or (obj.entity_title or "")


    def to_representation(self, instance):
        """
        ✅ Ensure file + thumbnail are absolute URLs so Next can render them.
        """
        data = super().to_representation(instance)
        req = self.context.get("request")
        if req:
            if data.get("file"):
                data["file"] = req.build_absolute_uri(data["file"])
            if data.get("thumbnail"):
                data["thumbnail"] = req.build_absolute_uri(data["thumbnail"])
        return data

    def validate(self, attrs):
        req = self.context.get("request")
        user = getattr(req, "user", None)

        # ✅ use existing instance values for partial updates
        instance = getattr(self, "instance", None)

        kind = attrs.get("kind") or (getattr(instance, "kind", None) if instance else "image")

        # file/url may not be in attrs during PATCH — fall back to existing
        uploaded = (req.FILES.get("file") if req else None) or attrs.get("file") or (getattr(instance, "file", None) if instance else None)
        url = attrs.get("url") if "url" in attrs else (getattr(instance, "url", None) if instance else None)

        # Basic inputs (only enforce "must have file or url" when it’s relevant)
        if kind in ("image", "file", "video"):
            if not uploaded and not url:
                raise serializers.ValidationError({"file": "Provide a file or url."})

        if kind == "image" and uploaded and getattr(uploaded, "content_type", "") and not (uploaded.content_type or "").startswith("image/"):
            raise serializers.ValidationError({"file": "Must be an image."})

        if kind == "link":
            if not url:
                raise serializers.ValidationError({"url": "Required for links."})

        # Ownership check: mode must belong to user (use instance mode if not provided)
        mode = attrs.get("mode") or (getattr(instance, "mode", None) if instance else None)
        if mode and user and user.is_authenticated:
            if getattr(mode, "user_id", None) != user.id:
                raise serializers.ValidationError({"mode": "Invalid mode."})

        return attrs

    def _resolve_entity(self, entity_name: str, entity_id: int):
        """
        Resolve the pinned entity and enforce ownership (entity.user == request.user)
        """
        req = self.context.get("request")
        user = getattr(req, "user", None)

        ct = ContentType.objects.get(model=entity_name.lower())
        model_cls = ct.model_class()

        qs = model_cls.objects.all()
        if user and user.is_authenticated and hasattr(model_cls, "user_id"):
            qs = qs.filter(user_id=user.id)

        instance = qs.get(id=entity_id)
        title = getattr(instance, "title", None) or "(Untitled)"
        return ct, instance.id, title

    def _download_to_thumbnail(self, pin: Pin, img_url: str):
        """
        You already call this from refresh_meta() and create().
        If you already have this implemented elsewhere, keep yours and delete this one.
        """
        import requests
        from django.core.files.base import ContentFile

        r = requests.get(img_url, timeout=8)
        r.raise_for_status()
        content_type = (r.headers.get("content-type") or "").lower()

        # pick extension
        ext = "jpg"
        if "png" in content_type:
            ext = "png"
        elif "webp" in content_type:
            ext = "webp"

        pin.thumbnail.save(f"{pin.id}_linkthumb.{ext}", ContentFile(r.content), save=False)
    def update(self, instance, validated_data):
        new_mode = validated_data.get("mode", None)

        # Do the normal update first (or before; either is fine)
        instance = super().update(instance, validated_data)

        # ✅ If this pin is "flat to a mode" (entity is Mode),
        # then moving it to a new mode should also move the entity link.
        if new_mode and instance.content_type and instance.content_type.model == "mode":
            instance.object_id = new_mode.id
            instance.entity_title = getattr(new_mode, "title", "") or "(Untitled)"
            instance.save(update_fields=["object_id", "entity_title"])

        return instance
    def create(self, validated_data):
        req = self.context.get("request")

        # ✅ if view passes serializer.save(user=...), it will be here
        user = validated_data.pop("user", None) or getattr(req, "user", None)

        uploaded = validated_data.pop("file", None) or (
            req.FILES.get("file") if req else None
        )
        entity_name = validated_data.pop("entity", None)
        entity_id = validated_data.pop("entity_id", None)

        if not entity_name or entity_id is None:
            raise serializers.ValidationError({"entity": "entity and entity_id required"})

        try:
            ct, obj_id, entity_title = self._resolve_entity(entity_name, int(entity_id))
        except ContentType.DoesNotExist:
            raise serializers.ValidationError({"entity": "Invalid entity"})
        except Exception:
            raise serializers.ValidationError({"entity_id": "Entity not found"})

        file_size = uploaded.size if uploaded else 0
        mime_type = (
            uploaded.content_type
            if (uploaded and getattr(uploaded, "content_type", None))
            else (guess_type(validated_data.get("url") or "")[0] or "")
        )

        # Link meta (title/desc/thumb)
        meta_title = meta_desc = meta_img = None
        if validated_data.get("kind") == "link" and validated_data.get("url"):
            try:
                meta = fetch_link_meta(validated_data["url"])
                meta_title = meta.get("title") or None
                meta_desc = meta.get("description") or None
                meta_img = meta.get("image") or None
            except Exception:
                pass

        if not validated_data.get("title") and meta_title:
            validated_data["title"] = meta_title
        if not validated_data.get("description") and meta_desc:
            validated_data["description"] = meta_desc

        # Create pin first (so we have id + stored file)
        pin = Pin.objects.create(
            user=user,
            content_type=ct,
            object_id=obj_id,
            entity_title=entity_title,
            file=uploaded,
            file_size=file_size,
            mime_type=mime_type,
            **validated_data,
        )

        # ✅ NEW: generate thumbnails for uploaded files (reliable for viewer/grid)
        try:
            if not pin.thumbnail and pin.file:
                mt = (pin.mime_type or "").lower()
                name = (pin.file.name or "").lower()

                # image thumb
                if pin.kind == "image" or mt.startswith("image/"):
                    thumb_cf = make_image_thumb(pin.file)
                    pin.thumbnail.save(f"{pin.id}_thumb.jpg", thumb_cf, save=False)

                # pdf thumb (file kind typically, but can be "file" even if user set kind oddly)
                elif mt == "application/pdf" or name.endswith(".pdf"):
                    thumb_cf = make_pdf_thumb(pin.file)
                    pin.thumbnail.save(f"{pin.id}_thumb.jpg", thumb_cf, save=False)
        except Exception:
            # Don't fail creation if thumb gen fails
            pass

        # Existing: link thumbnails from OG image / favicon (download and store)
        if not pin.thumbnail:
            try:
                img_url = meta_img
                if not img_url and pin.kind == "link" and pin.url:
                    img_url = try_fetch_favicon_url(pin.url)
                if img_url:
                    self._download_to_thumbnail(pin, img_url)
            except Exception:
                pass

        pin.save()
        return pin
