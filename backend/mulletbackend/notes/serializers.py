# notes/serializers.py
from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from .models import Note


def _extract_title(obj):
    for attr in ("title", "name", "label"):
        v = getattr(obj, attr, None)
        if v:
            return v
    return None


class NoteSerializer(serializers.ModelSerializer):
    body = serializers.CharField(max_length=50000)
    # Readable content_type for frontend ("mode"|"goal"|...)
    content_type = serializers.SerializerMethodField()
    display_title = serializers.SerializerMethodField()

    # Write-only inputs for create
    target_type = serializers.CharField(write_only=True, required=False)
    target_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = Note
        fields = [
            "id",
            "body",
            "mode",
            "created_at",
            "content_type",
            "object_id",
            "entity_title",
            "display_title",
            "target_type",
            "target_id",
        ]
        read_only_fields = [
        "id", "created_at", "content_type", "display_title",
        "entity_title", "object_id", "user",
        ]

    def get_content_type(self, obj):
        return obj.content_type.model if obj.content_type else None

    def get_display_title(self, obj):
        target = getattr(obj, "content_object", None)
        live = _extract_title(target) if target else None
        return live or (obj.entity_title or "")

    def validate(self, attrs):
        req = self.context.get("request")
        user = getattr(req, "user", None)

        # If mode provided, ensure it belongs to the user
        mode = attrs.get("mode")
        if mode and user and user.is_authenticated:
            if getattr(mode, "user_id", None) != user.id:
                raise serializers.ValidationError({"mode": "Invalid mode."})

        return attrs

    def _resolve_target(self, target_type: str, target_id: int):
        """
        Resolve target object and enforce ownership: target.user == request.user (if model has user_id).
        """
        req = self.context.get("request")
        user = getattr(req, "user", None)

        ct = ContentType.objects.get(model=target_type.lower())
        model_cls = ct.model_class()

        qs = model_cls.objects.all()
        if user and user.is_authenticated and hasattr(model_cls, "user_id"):
            qs = qs.filter(user_id=user.id)

        obj = qs.get(id=target_id)
        title = _extract_title(obj) or "(Untitled)"
        return ct, obj.id, title

    def create(self, validated_data):
        target_type = validated_data.pop("target_type", None) or self.initial_data.get("content_type")
        target_id = validated_data.pop("target_id", None) or self.initial_data.get("object_id")

        if not target_type or target_id is None:
            raise serializers.ValidationError({"target": "target_type/target_id (or content_type/object_id) required."})

        try:
            ct, obj_id, title = self._resolve_target(target_type, int(target_id))
        except ContentType.DoesNotExist:
            raise serializers.ValidationError({"target_type": "Invalid target_type."})
        except Exception:
            raise serializers.ValidationError({"target_id": "Target not found."})

        # IMPORTANT: do NOT pass `user=` here (view supplies it via serializer.save(user=...))
        note = Note.objects.create(
            content_type=ct,
            object_id=obj_id,
            entity_title=title,
            **validated_data,
        )
        return note
