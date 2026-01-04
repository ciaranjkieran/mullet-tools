from rest_framework.routers import DefaultRouter
from .views import NoteViewSet  # Use relative import to avoid circular issues

router = DefaultRouter()
router.register(r"notes", NoteViewSet, basename="note")

urlpatterns = router.urls  # ✅ This must be present
