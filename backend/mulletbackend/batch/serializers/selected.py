from rest_framework import serializers

class SelectedIdsSerializer(serializers.Serializer):
    task = serializers.ListField(child=serializers.IntegerField(), required=False, default=list)
    milestone = serializers.ListField(child=serializers.IntegerField(), required=False, default=list)
    project = serializers.ListField(child=serializers.IntegerField(), required=False, default=list)
    goal = serializers.ListField(child=serializers.IntegerField(), required=False, default=list)

    def validate(self, attrs):
        if not any(attrs.get(k) for k in ("task", "milestone", "project", "goal")):
            raise serializers.ValidationError("No ids provided.")
        return attrs
