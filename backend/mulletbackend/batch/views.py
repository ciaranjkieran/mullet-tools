from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from batch.serializers.delete import BatchDeleteSerializer
from batch.services.operations import do_delete
from batch.serializers.change_mode import BatchChangeModeSerializer
from batch.services.operations import do_change_mode

from batch.serializers.schedule import BatchScheduleSerializer
from batch.services.operations import do_schedule
from batch.serializers.group_under import BatchGroupUnderSerializer
from batch.services.operations import do_group_under
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from batch.serializers.delete import BatchDeleteSerializer  # reuse
from batch.services.operations import do_complete  
from rest_framework.permissions import IsAuthenticated

class BatchGroupUnderView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        ser = BatchGroupUnderSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        sel = ser.validated_data["selected"]
        parent_type = ser.validated_data["parentType"]
        parent_id = ser.validated_data["parentId"]
        out = do_group_under(sel, parent_type, parent_id, user=request.user)
        return Response({"ok": True, "changed": out}, status=status.HTTP_200_OK)

class BatchScheduleView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
      ser = BatchScheduleSerializer(data=request.data)
      ser.is_valid(raise_exception=True)
      sel = ser.validated_data["selected"]
      payload = {}
      if "dueDate" in ser.validated_data:
          payload["due_date"] = ser.validated_data["dueDate"]
      if "dueTime" in ser.validated_data:
          payload["due_time"] = ser.validated_data["dueTime"]
      out = do_schedule(sel, payload, user=request.user)
      return Response({"ok": True, "changed": out}, status=status.HTTP_200_OK)

class BatchChangeModeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        ser = BatchChangeModeSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        sel = ser.validated_data["selected"]
        mode_id = ser.validated_data["modeId"]
        out = do_change_mode(sel, mode_id, user=request.user)
        return Response({"ok": True, "changed": out}, status=status.HTTP_200_OK)
    
class BatchDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        ser = BatchDeleteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        out = do_delete(ser.validated_data["selected"], user=request.user)
        return Response({"ok": True, "deleted": out}, status=status.HTTP_200_OK)

class BatchCompleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        ser = BatchDeleteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        out = do_complete(ser.validated_data["selected"], user=request.user)
        return Response({"ok": True, "completed": out}, status=status.HTTP_200_OK)