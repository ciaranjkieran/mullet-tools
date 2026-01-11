from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.views.static import serve

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

    # ✅ MEDIA FILES (must be INSIDE urlpatterns)
    re_path(
        r"^media/(?P<path>.*)$",
        serve,
        {"document_root": settings.MEDIA_ROOT},
    ),
]
