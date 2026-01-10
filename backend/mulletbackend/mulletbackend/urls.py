from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),

    path("api/auth/", include("accounts.urls")),
    path("api/", include("core.urls")),
    path("api/", include("comments.urls")),
    path("api/", include("notes.urls")),
    path("api/", include("boards.urls")),
    path("api/", include("templates.urls")),
    path("api/", include("timers.urls")),
    path("api/batch/", include("batch.urls")),
]
         # or "apps.batch.urls" if the app lives in apps/


# ✅ Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)