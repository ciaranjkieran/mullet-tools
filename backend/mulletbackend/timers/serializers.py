# timer/serializers.py
import logging
from django.utils import timezone
from rest_framework import serializers

from .models import ActiveTimer, TimeEntry

log = logging.getLogger("timer")


class ActiveTimerSerializer(serializers.ModelSerializer):
    startedAt = serializers.DateTimeField(source="started_at")
    endsAt = serializers.DateTimeField(source="ends_at", allow_null=True)
    sessionId = serializers.UUIDField(source="session_id", allow_null=True)
    plannedSeconds = serializers.IntegerField(source="planned_seconds", allow_null=True)

    path = serializers.SerializerMethodField()

    remainingSeconds = serializers.SerializerMethodField()
    elapsedSeconds = serializers.SerializerMethodField()
    durationSec = serializers.SerializerMethodField()  # legacy UI compat

    class Meta:
        model = ActiveTimer
        fields = (
            "kind",
            "startedAt",
            "endsAt",
            "path",
            "sessionId",
            "plannedSeconds",
            "remainingSeconds",
            "elapsedSeconds",
            "durationSec",
        )

    def _corr(self):
        return (self.context or {}).get("corr", "—")

    def get_path(self, obj):
        return {
            "modeId": obj.mode_id,
            "goalId": obj.goal_id,
            "projectId": obj.project_id,
            "milestoneId": obj.milestone_id,
            "taskId": obj.task_id,
        }

    def get_remainingSeconds(self, obj):
        corr = self._corr()
        if obj.kind == "timer" and obj.ends_at:
            rem = int((obj.ends_at - timezone.now()).total_seconds())
            rem = rem if rem > 0 else 0
            log.info("[SER][%s] remainingSeconds ends_at=%s -> %s", corr, obj.ends_at, rem)
            return rem
        log.info("[SER][%s] remainingSeconds(kind=%s) -> None", corr, obj.kind)
        return None

    def get_elapsedSeconds(self, obj):
        corr = self._corr()
        now = timezone.now()
        elapsed = int((now - obj.started_at).total_seconds()) if obj.started_at else 0
        elapsed = elapsed if elapsed > 0 else 0
        log.info("[SER][%s] elapsedSeconds started_at=%s now=%s -> %s", corr, obj.started_at, now, elapsed)
        return elapsed

    def get_durationSec(self, obj):
        if obj.kind != "timer":
            return None
        rem = self.get_remainingSeconds(obj)
        return rem if isinstance(rem, int) else None


class TimeEntrySerializer(serializers.ModelSerializer):
    startedAt = serializers.DateTimeField(source="started_at")
    endedAt = serializers.DateTimeField(source="ended_at")
    sessionId = serializers.UUIDField(source="session_id", allow_null=True)
    plannedSeconds = serializers.IntegerField(source="planned_seconds", allow_null=True)

    path = serializers.SerializerMethodField()

    # snapshots
    modeTitle = serializers.CharField(source="mode_title_snapshot", read_only=True)
    goalTitle = serializers.CharField(source="goal_title_snapshot", read_only=True)
    projectTitle = serializers.CharField(source="project_title_snapshot", read_only=True)
    milestoneTitle = serializers.CharField(source="milestone_title_snapshot", read_only=True)
    taskTitle = serializers.CharField(source="task_title_snapshot", read_only=True)

    class Meta:
        model = TimeEntry
        fields = (
            "id",
            "kind",
            "startedAt",
            "endedAt",
            "seconds",
            "path",
            "note",
            "sessionId",
            "plannedSeconds",
            "modeTitle",
            "goalTitle",
            "projectTitle",
            "milestoneTitle",
            "taskTitle",
        )

    def get_path(self, obj):
        return {
            "modeId": obj.mode_id,
            "goalId": obj.goal_id,
            "projectId": obj.project_id,
            "milestoneId": obj.milestone_id,
            "taskId": obj.task_id,
        }
