# templates/views.py
from rest_framework import viewsets, permissions
from .models import Template
from .serializers import TemplateSerializer


class TemplateViewSet(viewsets.ModelViewSet):
    serializer_class = TemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # user-private templates + (optionally) public templates by others
        # If you DON'T want public templates yet, remove the is_public bit.
        return Template.objects.filter(user=self.request.user).order_by("-created_at")

        # When you’re ready for public browsing:
        # return Template.objects.filter(
        #     models.Q(user=self.request.user) | models.Q(is_public=True)
        # ).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
