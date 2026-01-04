# timer/models.py
import uuid
from django.db import models
from django.utils import timezone
from django.conf import settings

from core.models import Mode, Goal, Project, Milestone, Task


def _get_label(obj) -> str:
    if not obj:
        return ""
    return getattr(obj, "title", None) or getattr(obj, "name", None) or str(obj)


class TimeEntry(models.Model):
    KIND_CHOICES = (("stopwatch", "Stopwatch"), ("timer", "Timer"))

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="time_entries",
    )

    kind = models.CharField(max_length=10, choices=KIND_CHOICES)

    # Mode should hard-delete entries when a Mode is deleted (your choice)
    mode = models.ForeignKey(
        Mode,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="time_entries",
    )

    goal = models.ForeignKey(Goal, on_delete=models.SET_NULL, null=True, blank=True, related_name="time_entries")
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True, related_name="time_entries")
    milestone = models.ForeignKey(Milestone, on_delete=models.SET_NULL, null=True, blank=True, related_name="time_entries")
    task = models.ForeignKey(Task, on_delete=models.SET_NULL, null=True, blank=True, related_name="time_entries")

    started_at = models.DateTimeField()
    ended_at = models.DateTimeField()
    seconds = models.IntegerField()
    note = models.TextField(blank=True, default="")

    # Frozen labels (historical stability)
    mode_title_snapshot = models.CharField(max_length=255, blank=True, default="")
    goal_title_snapshot = models.CharField(max_length=255, blank=True, default="")
    project_title_snapshot = models.CharField(max_length=255, blank=True, default="")
    milestone_title_snapshot = models.CharField(max_length=255, blank=True, default="")
    task_title_snapshot = models.CharField(max_length=255, blank=True, default="")

    session_id = models.UUIDField(null=True, blank=True, db_index=True)
    planned_seconds = models.IntegerField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "started_at"]),
            models.Index(fields=["user", "mode", "started_at"]),
            models.Index(fields=["user", "task", "started_at"]),
            models.Index(fields=["user", "session_id"]),
        ]

    def __str__(self):
        return f"{self.user_id} · {self.kind} · {self.started_at} → {self.ended_at} · {self.seconds}s"

    def fill_snapshots_from_lineage(self):
        self.mode_title_snapshot = _get_label(self.mode)
        self.goal_title_snapshot = _get_label(self.goal)
        self.project_title_snapshot = _get_label(self.project)
        self.milestone_title_snapshot = _get_label(self.milestone)
        self.task_title_snapshot = _get_label(self.task)

    @classmethod
    def from_active_timer(cls, active_timer: "ActiveTimer", *, ended_at, seconds, note: str = ""):
        entry = cls(
            user=active_timer.user,
            kind=active_timer.kind,
            mode=active_timer.mode,
            goal=active_timer.goal,
            project=active_timer.project,
            milestone=active_timer.milestone,
            task=active_timer.task,
            started_at=active_timer.started_at,
            ended_at=ended_at,
            seconds=seconds,
            note=note,
            session_id=active_timer.session_id,
            planned_seconds=active_timer.planned_seconds,
        )
        entry.fill_snapshots_from_lineage()
        return entry


class ActiveTimer(models.Model):
    KIND_CHOICES = (("stopwatch", "Stopwatch"), ("timer", "Timer"))

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="active_timers",
    )

    kind = models.CharField(max_length=10, choices=KIND_CHOICES)

    mode = models.ForeignKey(Mode, on_delete=models.CASCADE, null=True, blank=True, related_name="active_timers")
    goal = models.ForeignKey(Goal, on_delete=models.SET_NULL, null=True, blank=True, related_name="active_timers")
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True, related_name="active_timers")
    milestone = models.ForeignKey(Milestone, on_delete=models.SET_NULL, null=True, blank=True, related_name="active_timers")
    task = models.ForeignKey(Task, on_delete=models.SET_NULL, null=True, blank=True, related_name="active_timers")

    started_at = models.DateTimeField(default=timezone.now)
    ends_at = models.DateTimeField(null=True, blank=True)

    session_id = models.UUIDField(null=True, blank=True, db_index=True)
    planned_seconds = models.IntegerField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user"], name="unique_active_timer_per_user"),
        ]
        indexes = [
            models.Index(fields=["user", "started_at"]),
            models.Index(fields=["user", "ends_at"]),
            models.Index(fields=["user", "session_id"]),
        ]

    def __str__(self):
        return f"{self.user_id} · {self.kind} · {self.started_at}"
