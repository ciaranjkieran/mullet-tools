# comments/serializers.py
import mimetypes

from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType

from .models import Comment, CommentAttachment


class CommentAttachmentSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = CommentAttachment
        fields = ["id", "url", "original_name", "mime", "uploaded_at"]
        read_only_fields = ["id", "url", "uploaded_at"]

    def get_url(self, obj):
        request = self.context.get("request")
        url = obj.file.url
        return request.build_absolute_uri(url) if request else url
from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ObjectDoesNotExist

from .models import Comment, CommentAttachment


class CommentSerializer(serializers.ModelSerializer):
    # write-only inputs for create/update
    entity = serializers.CharField(write_only=True, required=False)
    entity_id = serializers.IntegerField(write_only=True, required=False)

    entity_model = serializers.SerializerMethodField(read_only=True)
    entity_title = serializers.SerializerMethodField(read_only=True)
    attachments = CommentAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Comment
        fields = [
            "id",
            "mode",
            "body",
            "entity",
            "entity_id",
            "entity_model",
            "entity_title",
            "content_type",
            "object_id",
            "created_at",
            "is_deleted",
            "attachments",
        ]
        read_only_fields = [
            "content_type",
            "object_id",
            "created_at",
            "is_deleted",
            "attachments",
            "entity_model",
            "entity_title",
        ]

    def validate(self, attrs):
        """
        Require entity + entity_id on create.
        Allow PATCH without them (keeps existing relation).
        """
        creating = self.instance is None
        if creating:
            if not attrs.get("entity") or attrs.get("entity_id") is None:
                raise serializers.ValidationError(
                    {"entity": "Required", "entity_id": "Required"}
                )
        return attrs

    def _apply_entity_link(self, attrs):
        """
        Convert (entity, entity_id) into (content_type, object_id)
        and remove write-only fields so Model.objects.create() doesn't choke.
        """
        entity = attrs.pop("entity", None)
        entity_id = attrs.pop("entity_id", None)

        # If not provided (e.g. PATCH), do nothing
        if not entity or entity_id is None:
            return attrs

        try:
            ct = ContentType.objects.get(model=entity.lower())
        except ContentType.DoesNotExist:
            raise serializers.ValidationError({"entity": f"Unknown entity '{entity}'"})

        attrs["content_type"] = ct
        attrs["object_id"] = entity_id
        return attrs

    def create(self, validated_data):
        validated_data = self._apply_entity_link(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Optional: allow changing the linked entity on PATCH/PUT
        validated_data = self._apply_entity_link(validated_data)
        return super().update(instance, validated_data)

    def get_entity_model(self, obj):
        try:
            return obj.content_type.model if obj.content_type else None
        except Exception:
            return None

    def get_entity_title(self, obj):
        try:
            target = obj.content_object
        except Exception:
            return None
        if not target:
            return None

        return (
            getattr(target, "title", None)
            or getattr(target, "name", None)
            or getattr(target, "label", None)
            or "(Untitled)"
        )
