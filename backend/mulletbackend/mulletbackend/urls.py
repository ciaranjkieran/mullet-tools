from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.http import FileResponse, Http404, HttpResponseForbidden
import os

def protected_media(request, path):
    """Serve media files only to authenticated users."""
    if not request.user.is_authenticated:
        return HttpResponseForbidden("Authentication required.")
    file_path = os.path.join(settings.MEDIA_ROOT, path)
    if not os.path.isfile(file_path):
        raise Http404
    # Prevent path traversal
    real_media = os.path.realpath(settings.MEDIA_ROOT)
    real_file = os.path.realpath(file_path)
    if not real_file.startswith(real_media):
        raise Http404
    return FileResponse(open(file_path, "rb"))

urlpatterns = [
    # Admin
    path("admin/", admin.site.urls),

    # API apps
    path("api/auth/", include("accounts.urls")),
    path("api/", include("core.urls")),
    path("api/", include("comments.urls")),
    path("api/", include("notes.urls")),
    path("api/", include("boards.urls")),
    path("api/", include("templates.urls")),
    path("api/", include("timers.urls")),
    path("api/batch/", include("batch.urls")),
    path("api/collaboration/", include("collaboration.urls")),
    path("api/ai/", include("ai.urls")),

    # Media files — auth-gated
    re_path(r"^media/(?P<path>.*)$", protected_media),
]
