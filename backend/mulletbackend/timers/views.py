# timer/views.py
import logging
import uuid
from datetime import datetime, timedelta
from itertools import chain

from django.db import transaction
from django.db.models import F, Q, Sum, Value
from django.db.models.functions import Coalesce, TruncDate
from django.utils import timezone
from django.utils.dateparse import parse_date

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Goal, Milestone, Project, Task
from core.utils.archive_guard import destroy_or_archive

from .models import ActiveTimer, TimeEntry
from .serializers import ActiveTimerSerializer, TimeEntrySerializer
from .services import (
    auto_close_expired_if_any,
    close_active_into_entry,
    fetch_entities_by_ids,
    resolve_path,
    slice_active_until,
    stop_active_if_targeting,
    validate_duration_sec,
)
from .stats_tree import build_stats_tree

log = logging.getLogger("timer")


def _parse_date_window(request):
    """
    Parse ?from=YYYY-MM-DD&to=YYYY-MM-DD into an aware datetime window [start, end].
    If neither is provided, defaults to today (local date).
    """
    date_from_raw = request.query_params.get("from")
    date_to_raw = request.query_params.get("to")
    tz = timezone.get_current_timezone()

    if not date_from_raw and not date_to_raw:
        today = timezone.localdate()
        start = timezone.make_aware(datetime.combine(today, datetime.min.time()), tz)
        end = timezone.make_aware(datetime.combine(today, datetime.max.time()), tz)
        return start, end

    if date_from_raw:
        df = parse_date(date_from_raw)
        if not df:
            return None, None
        start = timezone.make_aware(datetime.combine(df, datetime.min.time()), tz)
    else:
        # consistent with local tz
        start = timezone.make_aware(datetime(1970, 1, 1, 0, 0, 0), tz)

    if date_to_raw:
        dt = parse_date(date_to_raw)
        if not dt:
            return None, None
        end = timezone.make_aware(datetime.combine(dt, datetime.max.time()), tz)
    else:
        end = timezone.now()

    return start, end


def _next_by_position(qs, *, current_position: int, current_id: int):
    return (
        qs.filter(Q(position__gt=current_position) | Q(position=current_position, id__gt=current_id))
        .order_by("position", "id")
        .first()
    )


class StartTimerView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        user = request.user

        resume_from_id = request.data.get("resumeFromEntryId")
        if resume_from_id:
            # ---- RESUME FLOW ----
            try:
                seed = TimeEntry.objects.select_for_update().get(user=user, pk=int(resume_from_id))
            except (ValueError, TimeEntry.DoesNotExist):
                return Response({"detail": "resumeFromEntryId not found."}, status=status.HTTP_404_NOT_FOUND)

            if not seed.session_id:
                seed.session_id = uuid.uuid4()
                seed.save(update_fields=["session_id"])

            session_id = seed.session_id
            elapsed = (
                TimeEntry.objects.filter(user=user, session_id=session_id)
                .aggregate(s=Coalesce(Sum("seconds"), 0))["s"]
            )

            now = timezone.now()

            existing = ActiveTimer.objects.select_for_update().filter(user=user).first()
            if existing:
                close_active_into_entry(existing)

            kind = seed.kind
            ends_at = None
            planned_seconds = seed.planned_seconds

            if kind == "timer":
                if not planned_seconds:
                    return Response(
                        {"detail": "Cannot resume timer: original plannedSeconds unknown."},
                        status=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    )
                remaining = max(0, int(planned_seconds) - int(elapsed))
                if remaining < 1:
                    return Response(
                        {"detail": "Nothing left to resume (0s remaining)."},
                        status=status.HTTP_409_CONFLICT,
                    )
                ends_at = now + timedelta(seconds=remaining)

            active = ActiveTimer.objects.create(
                user=user,
                kind=kind,
                mode_id=seed.mode_id,
                goal_id=seed.goal_id,
                project_id=seed.project_id,
                milestone_id=seed.milestone_id,
                task_id=seed.task_id,
                started_at=now,
                ends_at=ends_at,
                session_id=session_id,
                planned_seconds=planned_seconds,
            )
            return Response(ActiveTimerSerializer(active).data, status=status.HTTP_201_CREATED)

        # ---- FRESH START FLOW ----
        kind = request.data.get("kind", "stopwatch")
        duration_sec = validate_duration_sec(request.data.get("durationSec"))

        entities = fetch_entities_by_ids(
            user=user,
            mode_id=request.data.get("modeId"),
            goal_id=request.data.get("goalId"),
            project_id=request.data.get("projectId"),
            milestone_id=request.data.get("milestoneId"),
            task_id=request.data.get("taskId"),
        )
        path = resolve_path(**entities)
        if not path.get("mode"):
            return Response(
                {"detail": "A mode could not be resolved from the provided ids."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing = ActiveTimer.objects.select_for_update().filter(user=user).first()
        if existing:
            close_active_into_entry(existing)

        now = timezone.now()
        ends_at = None
        planned_seconds = None
        session_id = uuid.uuid4()

        if kind == "timer" and duration_sec > 0:
            planned_seconds = duration_sec
            ends_at = now + timedelta(seconds=duration_sec)

        active = ActiveTimer.objects.create(
            user=user,
            kind=kind,
            mode=path["mode"],
            goal=path.get("goal"),
            project=path.get("project"),
            milestone=path.get("milestone"),
            task=path.get("task"),
            started_at=now,
            ends_at=ends_at,
            session_id=session_id,
            planned_seconds=planned_seconds,
        )
        return Response(ActiveTimerSerializer(active).data, status=status.HTTP_201_CREATED)


class StopTimerView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        user = request.user
        active = ActiveTimer.objects.select_for_update().filter(user=user).first()
        if not active:
            return Response({"detail": "No active timer."}, status=status.HTTP_409_CONFLICT)

        entry = close_active_into_entry(active)
        return Response(TimeEntrySerializer(entry).data, status=status.HTTP_201_CREATED)


class ActiveTimerView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def get(self, request):
        user = request.user
        corr = request.headers.get("X-Req-Id") or uuid.uuid4().hex[:8]
        log.info("[GET][%s] Enter /timer/active user=%s", corr, user.id)

        auto_close_expired_if_any(user=user)

        active = ActiveTimer.objects.filter(user=user).first()
        if not active:
            return Response(status=status.HTTP_204_NO_CONTENT)

        ser = ActiveTimerSerializer(active, context={"corr": corr})
        return Response(ser.data)

    @transaction.atomic
    def patch(self, request):
        user = request.user
        corr = request.headers.get("X-Req-Id") or uuid.uuid4().hex[:8]

        auto_close_expired_if_any(user=user)

        active = ActiveTimer.objects.select_for_update().filter(user=user).first()
        if not active:
            return Response({"detail": "No active timer."}, status=status.HTTP_409_CONFLICT)

        if active.kind != "stopwatch":
            return Response(
                {"detail": "On-the-fly switching is only supported for the stopwatch."},
                status=status.HTTP_409_CONFLICT,
            )

        allowed = ("modeId", "goalId", "projectId", "milestoneId", "taskId")
        if not any(k in request.data for k in allowed):
            return Response({"detail": "No retarget keys provided."}, status=status.HTTP_400_BAD_REQUEST)

        def _norm(v):
            if v is None:
                return None
            try:
                return int(v)
            except (TypeError, ValueError):
                raise ValueError

        try:
            ids = {
                "mode_id": _norm(request.data.get("modeId")) if "modeId" in request.data else active.mode_id,
                "goal_id": _norm(request.data.get("goalId")) if "goalId" in request.data else active.goal_id,
                "project_id": _norm(request.data.get("projectId")) if "projectId" in request.data else active.project_id,
                "milestone_id": _norm(request.data.get("milestoneId")) if "milestoneId" in request.data else active.milestone_id,
                "task_id": _norm(request.data.get("taskId")) if "taskId" in request.data else active.task_id,
            }
        except ValueError:
            return Response({"detail": "All ids must be integers or null."}, status=status.HTTP_400_BAD_REQUEST)

        # cascade “deepest edited wins” nulling
        present = {k for k in allowed if k in request.data}
        order = ["modeId", "goalId", "projectId", "milestoneId", "taskId"]
        deepest = next((k for k in reversed(order) if k in present), None)
        if deepest == "modeId":
            ids.update(goal_id=None, project_id=None, milestone_id=None, task_id=None)
        elif deepest == "goalId":
            ids.update(project_id=None, milestone_id=None, task_id=None)
        elif deepest == "projectId":
            ids.update(milestone_id=None, task_id=None)
        elif deepest == "milestoneId":
            ids.update(task_id=None)

        entities = fetch_entities_by_ids(user=user, **ids)
        new_path = resolve_path(**entities)
        if not new_path.get("mode"):
            return Response(
                {"detail": "A mode could not be resolved from the provided ids."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_ids = dict(
            mode=active.mode_id,
            goal=active.goal_id,
            project=active.project_id,
            milestone=active.milestone_id,
            task=active.task_id,
        )
        new_ids = dict(
            mode=new_path["mode"].id if new_path["mode"] else None,
            goal=new_path["goal"].id if new_path["goal"] else None,
            project=new_path["project"].id if new_path["project"] else None,
            milestone=new_path["milestone"].id if new_path["milestone"] else None,
            task=new_path["task"].id if new_path["task"] else None,
        )

        if new_ids == old_ids:
            return Response(ActiveTimerSerializer(active, context={"corr": corr}).data)

        # Close the “old segment” up to now, then start a new segment from now.
        now = timezone.now()
        slice_active_until(active, until=now, corr=corr)

        active.mode = new_path["mode"]
        active.goal = new_path["goal"]
        active.project = new_path["project"]
        active.milestone = new_path["milestone"]
        active.task = new_path["task"]
        active.started_at = now  # ✅ make update_fields correct + segment semantics clear
        active.save(update_fields=["mode", "goal", "project", "milestone", "task", "started_at"])

        return Response(
            ActiveTimerSerializer(active, context={"corr": corr}).data,
            status=status.HTTP_200_OK,
        )


class TimeEntriesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start, end = _parse_date_window(request)
        if start is None:
            return Response({"detail": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        qs = (
            TimeEntry.objects.filter(user=request.user, started_at__gte=start, started_at__lte=end)
            .order_by("started_at")
        )
        return Response(TimeEntrySerializer(qs, many=True).data)


class TimeEntryDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk: int):
        try:
            entry = TimeEntry.objects.get(user=request.user, pk=pk)
        except TimeEntry.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if not entry.ended_at:
            return Response({"detail": "Cannot delete an active entry."}, status=status.HTTP_409_CONFLICT)

        now = timezone.now()
        if entry.ended_at < now - timedelta(hours=24) or entry.ended_at > now:
            return Response(
                {"detail": "Only entries ended within the last 24 hours can be deleted."},
                status=status.HTTP_403_FORBIDDEN,
            )

        entry.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class StatsSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from_raw = request.GET.get("from")
        to_raw = request.GET.get("to")
        mode_id_raw = request.GET.get("modeId")

        qs = TimeEntry.objects.filter(user=request.user)

        if from_raw:
            df = parse_date(from_raw)
            if not df:
                return Response({"detail": "from must be a valid date in YYYY-MM-DD format."}, status=status.HTTP_400_BAD_REQUEST)
            qs = qs.filter(started_at__date__gte=df)

        if to_raw:
            dt = parse_date(to_raw)
            if not dt:
                return Response({"detail": "to must be a valid date in YYYY-MM-DD format."}, status=status.HTTP_400_BAD_REQUEST)
            qs = qs.filter(started_at__date__lte=dt)

        if from_raw and to_raw:
            if parse_date(to_raw) and parse_date(from_raw) and parse_date(to_raw) < parse_date(from_raw):
                return Response({"detail": "to must be on or after from."}, status=status.HTTP_400_BAD_REQUEST)

        if mode_id_raw:
            try:
                qs = qs.filter(mode_id=int(mode_id_raw))
            except (TypeError, ValueError):
                return Response({"detail": "Invalid integer for modeId."}, status=status.HTTP_400_BAD_REQUEST)

        tasks = (
            qs.filter(task__isnull=False)
            .values(entityId=F("task_id"))
            .annotate(seconds=Coalesce(Sum("seconds"), 0))
            .annotate(entityType=Value("task"))
        )
        milestones = (
            qs.filter(milestone__isnull=False)
            .values(entityId=F("milestone_id"))
            .annotate(seconds=Coalesce(Sum("seconds"), 0))
            .annotate(entityType=Value("milestone"))
        )
        projects = (
            qs.filter(project__isnull=False)
            .values(entityId=F("project_id"))
            .annotate(seconds=Coalesce(Sum("seconds"), 0))
            .annotate(entityType=Value("project"))
        )
        goals = (
            qs.filter(goal__isnull=False)
            .values(entityId=F("goal_id"))
            .annotate(seconds=Coalesce(Sum("seconds"), 0))
            .annotate(entityType=Value("goal"))
        )

        combined = list(chain(tasks, milestones, projects, goals))
        combined_sorted = sorted(combined, key=lambda x: x["seconds"], reverse=True)

        return Response(
            {
                "total": int(qs.aggregate(total=Coalesce(Sum("seconds"), 0))["total"]),
                "topEntities": combined_sorted,
            }
        )


class CompleteNextView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        user = request.user

        entity_type = request.data.get("entityType")
        entity_id = request.data.get("entityId")

        if entity_type not in ("task", "milestone", "project", "goal"):
            return Response(
                {"detail": "entityType must be one of: task, milestone, project, goal."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            entity_id = int(entity_id)
        except (TypeError, ValueError):
            return Response({"detail": "entityId must be an integer."}, status=status.HTTP_400_BAD_REQUEST)

        model_map = {"task": Task, "milestone": Milestone, "project": Project, "goal": Goal}
        Model = model_map[entity_type]

        entity = Model.all_objects.select_for_update().filter(user=user, id=entity_id).first()
        if not entity:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        stop_kwargs = {f"{entity_type}_id": entity.id}
        stopped_entry = stop_active_if_targeting(user=user, **stop_kwargs)

        next_entity = None

        if entity_type == "task":
            qs = Task.objects.filter(user=user, is_completed=False, mode_id=entity.mode_id)
            if entity.milestone_id:
                qs = qs.filter(milestone_id=entity.milestone_id)
            elif entity.project_id:
                qs = qs.filter(project_id=entity.project_id, milestone_id__isnull=True)
            elif entity.goal_id:
                qs = qs.filter(goal_id=entity.goal_id, project_id__isnull=True, milestone_id__isnull=True)
            else:
                qs = qs.filter(goal_id__isnull=True, project_id__isnull=True, milestone_id__isnull=True)
            next_entity = _next_by_position(qs, current_position=entity.position, current_id=entity.id)

        elif entity_type == "milestone":
            qs = Milestone.objects.filter(user=user, is_completed=False, mode_id=entity.mode_id)
            if entity.parent_id is not None:
                qs = qs.filter(parent_id=entity.parent_id)
            elif entity.project_id:
                qs = qs.filter(project_id=entity.project_id, parent_id__isnull=True)
            elif entity.goal_id:
                qs = qs.filter(goal_id=entity.goal_id, project_id__isnull=True, parent_id__isnull=True)
            else:
                qs = qs.filter(project_id__isnull=True, goal_id__isnull=True, parent_id__isnull=True)
            next_entity = _next_by_position(qs, current_position=entity.position, current_id=entity.id)

        elif entity_type == "project":
            qs = Project.objects.filter(user=user, is_completed=False, mode_id=entity.mode_id)
            if entity.parent_id is not None:
                qs = qs.filter(parent_id=entity.parent_id)
            elif entity.goal_id:
                qs = qs.filter(goal_id=entity.goal_id, parent_id__isnull=True)
            else:
                qs = qs.filter(goal_id__isnull=True, parent_id__isnull=True)
            next_entity = _next_by_position(qs, current_position=entity.position, current_id=entity.id)

        else:  # goal
            qs = Goal.objects.filter(user=user, is_completed=False, mode_id=entity.mode_id)
            next_entity = _next_by_position(qs, current_position=entity.position, current_id=entity.id)

        destroy_or_archive(entity_type, entity)

        resp = {
            "stoppedEntry": TimeEntrySerializer(stopped_entry).data if stopped_entry else None,
            "completed": {"entityType": entity_type, "entityId": entity_id},
            "next": None,
            "dropdownEmpty": next_entity is None,
        }

        if next_entity:
            path = {
                "modeId": getattr(next_entity, "mode_id", None),
                "goalId": getattr(next_entity, "goal_id", None),
                "projectId": getattr(next_entity, "project_id", None),
                "milestoneId": getattr(next_entity, "milestone_id", None),
                "taskId": None,
            }

            if entity_type == "task":
                path["taskId"] = next_entity.id
            elif entity_type == "milestone":
                path["milestoneId"] = next_entity.id
            elif entity_type == "project":
                path["projectId"] = next_entity.id
                path["milestoneId"] = None
            elif entity_type == "goal":
                path["goalId"] = next_entity.id
                path["projectId"] = None
                path["milestoneId"] = None

            resp["next"] = {"entityType": entity_type, "entityId": next_entity.id, "path": path}

        return Response(resp, status=status.HTTP_200_OK)


class StatsDailyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start, end = _parse_date_window(request)
        if start is None:
            return Response({"detail": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        qs = TimeEntry.objects.filter(user=request.user, started_at__gte=start, started_at__lte=end)

        mode_id = request.query_params.get("modeId")
        if mode_id:
            try:
                qs = qs.filter(mode_id=int(mode_id))
            except ValueError:
                return Response({"detail": "Invalid integer for modeId."}, status=status.HTTP_400_BAD_REQUEST)

        daily = (
            qs.annotate(day=TruncDate("started_at"))
            .values("day")
            .annotate(seconds=Coalesce(Sum("seconds"), 0))
            .order_by("day")
        )

        return Response([{"date": r["day"].isoformat(), "seconds": int(r["seconds"])} for r in daily])


class StatsTreeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        mode_raw = request.query_params.get("modeId")
        from_raw = request.query_params.get("from")
        to_raw = request.query_params.get("to")

        if not mode_raw or not from_raw or not to_raw:
            return Response(
                {"detail": "modeId, from, and to are required query parameters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            mode_id = int(mode_raw)
        except (TypeError, ValueError):
            return Response({"detail": "modeId must be an integer."}, status=status.HTTP_400_BAD_REQUEST)

        from_date = parse_date(from_raw)
        to_date = parse_date(to_raw)
        if not from_date or not to_date:
            return Response({"detail": "from/to must be valid dates in YYYY-MM-DD format."}, status=status.HTTP_400_BAD_REQUEST)
        if to_date < from_date:
            return Response({"detail": "to must be on or after from."}, status=status.HTTP_400_BAD_REQUEST)

        tz = timezone.get_current_timezone()
        from_dt = timezone.make_aware(datetime.combine(from_date, datetime.min.time()), tz)
        to_dt = timezone.make_aware(datetime.combine(to_date + timedelta(days=1), datetime.min.time()), tz)

        tree = build_stats_tree(user=request.user, mode_id=mode_id, from_dt=from_dt, to_dt=to_dt)
        return Response(tree, status=status.HTTP_200_OK)


class StatsChainUpView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        entity_type = request.data.get("entityType")
        entity_id = request.data.get("entityId")

        if entity_type not in ("task", "milestone", "project", "goal"):
            return Response({"detail": "entityType must be one of: task, milestone, project, goal."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            entity_id = int(entity_id)
        except (TypeError, ValueError):
            return Response({"detail": "entityId must be an integer."}, status=status.HTTP_400_BAD_REQUEST)

        qs = TimeEntry.objects.filter(user=request.user)

        if entity_type == "task":
            qs = qs.filter(task_id=entity_id)
            update_kwargs = {"task": None}
        elif entity_type == "milestone":
            qs = qs.filter(milestone_id=entity_id, task__isnull=True)
            update_kwargs = {"milestone": None}
        elif entity_type == "project":
            qs = qs.filter(project_id=entity_id, milestone__isnull=True, task__isnull=True)
            update_kwargs = {"project": None}
        else:  # goal
            qs = qs.filter(goal_id=entity_id, project__isnull=True, milestone__isnull=True, task__isnull=True)
            update_kwargs = {"goal": None}

        updated = qs.update(**update_kwargs)

        log.info("[CHAIN-UP] user=%s entity_type=%s entity_id=%s updated=%s", request.user.id, entity_type, entity_id, updated)
        return Response({"updated": int(updated)}, status=status.HTTP_200_OK)


class ClearStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, *args, **kwargs):
        start, end = _parse_date_window(request)
        if start is None:
            return Response({"detail": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        qs = TimeEntry.objects.filter(user=request.user, started_at__gte=start, started_at__lte=end)

        mode_id = request.query_params.get("modeId")
        if mode_id:
            try:
                qs = qs.filter(mode_id=int(mode_id))
            except (TypeError, ValueError):
                return Response({"detail": "Invalid integer for modeId."}, status=status.HTTP_400_BAD_REQUEST)

        deleted_count, _ = qs.delete()

        log.info(
            "[CLEAR-STATS] user=%s from=%s to=%s mode_id=%s deleted=%s",
            request.user.id,
            start,
            end,
            mode_id,
            deleted_count,
        )
        return Response({"deleted": int(deleted_count)}, status=status.HTTP_200_OK)
