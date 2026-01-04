# boards/urls.py
from rest_framework.routers import DefaultRouter
from .views import PinViewSet
from django.urls import path, include

router = DefaultRouter()
router.register(r"pins", PinViewSet, basename="pin")

urlpatterns = [
    path("boards/", include(router.urls)),  # ✅ Adds the 'boards/' prefix
]
