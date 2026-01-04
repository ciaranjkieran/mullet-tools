from rest_framework import serializers
from .selected import SelectedIdsSerializer

class BatchChangeModeSerializer(serializers.Serializer):
    selected = SelectedIdsSerializer()
    modeId = serializers.IntegerField()
