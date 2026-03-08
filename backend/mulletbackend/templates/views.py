# templates/views.py
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Template
from .serializers import TemplateSerializer
from .services import apply_template_data


class TemplateViewSet(viewsets.ModelViewSet):
    serializer_class = TemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Template.objects.filter(user=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["post"], url_path="apply")
    def apply_template(self, request):
        """
        Bulk-apply a template: creates all entities in a single transaction.
        Accepts either a template ID or inline template data.

        Body: { type, mode, data, title? }
           or { templateId }
        """
        template_id = request.data.get("templateId")

        if template_id:
            try:
                tpl = Template.objects.get(id=template_id, user=request.user)
            except Template.DoesNotExist:
                return Response(
                    {"error": "Template not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )
            tpl_type = tpl.type
            tpl_data = tpl.data
            mode_id = tpl.mode_id
        else:
            tpl_type = request.data.get("type")
            tpl_data = request.data.get("data")
            mode_id = request.data.get("mode")

            if not tpl_type or not tpl_data or not mode_id:
                return Response(
                    {"error": "type, mode, and data are required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        try:
            entity = apply_template_data(
                user=request.user,
                template_type=tpl_type,
                data=tpl_data,
                mode_id=mode_id,
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "ok": True,
                "type": tpl_type,
                "id": entity.id,
                "title": entity.title,
                "modeId": entity.mode_id,
            },
            status=status.HTTP_201_CREATED,
        )
