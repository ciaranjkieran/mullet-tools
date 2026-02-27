from django.urls import path
from .views import AiBuildView, AiCommitView

urlpatterns = [
    path("build/", AiBuildView.as_view(), name="ai-build"),
    path("commit/", AiCommitView.as_view(), name="ai-commit"),
]
