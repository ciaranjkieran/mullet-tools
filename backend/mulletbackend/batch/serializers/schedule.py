from rest_framework import serializers
from .selected import SelectedIdsSerializer

class BatchScheduleSerializer(serializers.Serializer):
    selected = SelectedIdsSerializer()
    dueDate = serializers.DateField(allow_null=True)
    dueTime = serializers.TimeField(allow_null=True, required=False)
