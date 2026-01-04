from rest_framework import serializers
from .selected import SelectedIdsSerializer

class BatchDeleteSerializer(serializers.Serializer):
    selected = SelectedIdsSerializer()
