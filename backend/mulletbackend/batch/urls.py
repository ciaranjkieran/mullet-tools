from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    BatchDeleteView,
    BatchChangeModeView,
    BatchScheduleView,
    BatchGroupUnderView,
    BatchCompleteView
)


urlpatterns = [
    path("delete/", BatchDeleteView.as_view(), name="batch-delete"),
    path("change-mode/", BatchChangeModeView.as_view(), name="batch-change-mode"),
    path("schedule/", BatchScheduleView.as_view(), name="batch-schedule"),
    path("group-under/", BatchGroupUnderView.as_view(), name="batch-group-under"),
    path("complete/", BatchCompleteView.as_view()),

]

# 🔗 Add router URLs *after* your list-based URLs
