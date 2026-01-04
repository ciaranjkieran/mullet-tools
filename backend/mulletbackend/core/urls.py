from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ModeViewSet,
    TaskViewSet,
    MilestoneViewSet,
    ProjectViewSet,
    GoalViewSet,
    TaskBulkUpdateView,
    BulkTaskPositionUpdateView,
    BulkMilestonePositionUpdateView,
    MilestoneBulkUpdateView,
    ProjectBulkUpdateView,
    GoalBulkUpdateView,
    TaskReorderHomeView,
    MilestoneReorderHomeView,
    ProjectReorderHomeView, 
    GoalReorderHomeView,
    TaskReorderTodayView,
    ProjectReorderTodayView,
      MilestoneReorderTodayView,
      GoalReorderTodayView
          # ← NEW
)

router = DefaultRouter()
router.register("modes", ModeViewSet, basename="modes")
router.register("tasks", TaskViewSet, basename="tasks")
router.register("milestones", MilestoneViewSet, basename="milestones")
router.register("projects", ProjectViewSet, basename="projects")
router.register("goals", GoalViewSet, basename="goals")

urlpatterns = [
    # Bulk update endpoints
    path("tasks/bulk-update-positions/", BulkTaskPositionUpdateView.as_view(), name="task-bulk-position-update"),
    path("tasks/bulk/", TaskBulkUpdateView.as_view(), name="task-bulk-update"),
    path("milestones/bulk/", MilestoneBulkUpdateView.as_view(), name="milestone-bulk-update"),
    path("projects/bulk/", ProjectBulkUpdateView.as_view(), name="project-bulk-update"),
    path("goals/bulk/", GoalBulkUpdateView.as_view(), name="goal-bulk-update"),

    # Reorder-home endpoints (DnD)
    path("tasks/reorder-home/", TaskReorderHomeView.as_view(), name="task-reorder-home"),
    path("milestones/reorder-home/", MilestoneReorderHomeView.as_view(), name="milestone-reorder-home"),
    path("projects/reorder-home/", ProjectReorderHomeView.as_view(), name="project-reorder-home"),
    path("projects/reorder-today/", ProjectReorderTodayView.as_view(), name="projects-reorder-today"),

    path("goals/reorder-home/", GoalReorderHomeView.as_view(), name="goal-reorder-home"),
    path("tasks/reorder-today/", TaskReorderTodayView.as_view(), name="task-reorder-today"),
    path("api/goals/reorder-today/", GoalReorderTodayView.as_view(), name="goals-reorder-today"),

    # Position bulk-update endpoints
    path("milestones/bulk-update-positions/", BulkMilestonePositionUpdateView.as_view(), name="milestone-bulk-position-update"),
    path("milestones/reorder-today/", MilestoneReorderTodayView.as_view(), name="milestones-reorder-today"),

    # Router endpoints
    path("", include(router.urls)),
]
