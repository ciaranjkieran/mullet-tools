# templates/serializers.py
from rest_framework import serializers
from .models import Template


class TemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Template
        fields = [
            "id",
            "title",
            "type",
            "mode",
            "created_at",
            "tags",
            "data",
            "is_public",
            "user",
        ]
        read_only_fields = ["id", "created_at", "user"]

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        mode = attrs.get("mode")
        if mode and user and user.is_authenticated:
            # core.Mode has user_id in your setup
            if getattr(mode, "user_id", None) != user.id:
                raise serializers.ValidationError({"mode": "Invalid mode."})

        return attrs
