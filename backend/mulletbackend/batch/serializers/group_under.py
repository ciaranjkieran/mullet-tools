from rest_framework import serializers
from .selected import SelectedIdsSerializer

PARENT_CHOICES = (("goal", "goal"), ("project", "project"), ("milestone", "milestone"))

class BatchGroupUnderSerializer(serializers.Serializer):
    selected = SelectedIdsSerializer()
    parentType = serializers.ChoiceField(choices=PARENT_CHOICES)
    parentId = serializers.IntegerField()
