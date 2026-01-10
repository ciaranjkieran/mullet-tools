from rest_framework.viewsets import ModelViewSet
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
import logging
from django.db.models import F, Max

logger = logging.getLogger(__name__)
from django.db import transaction

from .models import Mode, Goal, Project, Milestone, Task
from .serializers import (
    ModeSerializer,
    GoalSerializer,
    ProjectSerializer,
    MilestoneSerializer,
    TaskSerializer,
    MilestoneReorderHomeSerializer,
    TaskReorderHomeSerializer,
    TaskReorderTodaySerializer,
    MilestoneReorderTodaySerializer,
    ProjectReorderTodaySerializer,
    GoalReorderHomeSerializer,
    GoalReorderTodaySerializer,
    ProjectReorderHomeSerializer,
)
from .utils.archive_guard import destroy_or_archive
from timers.services import stop_active_if_targeting

from comments.services import soft_delete_comments_for_instance

# ─────────────────────────────────────────────
# MODES
# ─────────────────────────────────────────────
class ModeViewSet(ModelViewSet):
    serializer_class = ModeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Mode.objects.filter(user=self.request.user).order_by("position", "id")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["POST"])
    def reorder(self, request):
        orders = request.data.get("orders", [])
        id_to_pos = {
            int(o["id"]): int(o["position"])
            for o in orders
            if "id" in o and "position" in o
        }

        if not id_to_pos:
            return Response(ModeSerializer(self.get_queryset(), many=True).data)

        qs = Mode.objects.filter(
            user=request.user,
            id__in=id_to_pos.keys(),
        ).only("id", "position")

        modes = list(qs)
        if not modes:
            return Response(ModeSerializer(self.get_queryset(), many=True).data)

        # Choose a safe offset so phase-1 positions never collide
        # (max position + a buffer bigger than count is plenty)
        max_pos = (
            Mode.objects.filter(user=request.user).aggregate(m=Max("position"))["m"] or 0
        )
        offset = max_pos + len(id_to_pos) + 1

        with transaction.atomic():
            # Phase 1: move affected modes out of the way (avoids unique collisions)
            qs.update(position=F("position") + offset)

            # Phase 2: apply final requested positions
            for m in modes:
                m.position = id_to_pos.get(m.id, m.position)
            Mode.objects.bulk_update(modes, ["position"])

        return Response(ModeSerializer(self.get_queryset(), many=True).data)



# ─────────────────────────────────────────────
# GOALS
# ─────────────────────────────────────────────
class GoalViewSet(ModelViewSet):
    serializer_class = GoalSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Goal.objects.filter(user=self.request.user).order_by("position", "id")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @transaction.atomic
    def perform_update(self, serializer):
        instance: Goal = self.get_object()
        old_mode_id = instance.mode_id
        was_completed = instance.is_completed

        updated = serializer.save()

        if (not was_completed) and updated.is_completed:
            stop_active_if_targeting(user=self.request.user, goal_id=updated.id)

        if old_mode_id != updated.mode_id:
            updated.cascade_mode_to_descendants()

    def perform_destroy(self, instance: Goal) -> None:
        # ✅ stop timer if targeting this goal (symmetry with perform_update)
        stopped = stop_active_if_targeting(user=self.request.user, goal_id=instance.id)

        # ✅ NEW: soft-delete comments attached to this goal
        soft_delete_comments_for_instance(user=self.request.user, instance=instance)

        destroy_or_archive("goal", instance)



class GoalBulkUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        goal_ids = request.data.get("goalIds")
        due_date = request.data.get("dueDate")
        mode_id = request.data.get("modeId")

        if not goal_ids:
            return Response({"error": "Missing goalIds"}, status=400)

        goals = Goal.objects.filter(user=request.user, id__in=goal_ids)
        for goal in goals:
            old_mode_id = goal.mode_id

            if due_date is not None:
                goal.due_date = due_date
            if mode_id is not None:
                goal.mode_id = mode_id

            goal.save()

            if mode_id is not None and old_mode_id != goal.mode_id:
                goal.cascade_mode_to_descendants()

        return Response(
            GoalSerializer(goals, many=True).data,
            status=status.HTTP_200_OK,
        )


class GoalReorderHomeView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        serializer = GoalReorderHomeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        mode_id = serializer.validated_data["mode_id"]
        container = serializer.validated_data["container"]
        changes = serializer.validated_data["changes"]

        container_kind = container["kind"]
        if container_kind != "mode":
            return Response(
                {"detail": "Invalid container kind for goals. Use 'mode'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        filter_kwargs = {
            "user": request.user,
            "mode_id": mode_id,
        }

        ids = [c["id"] for c in changes]
        pos_map = {c["id"]: c["position"] for c in changes}

        with transaction.atomic():
            qs = Goal.objects.filter(id__in=ids, **filter_kwargs).only("id", "position")
            for g in qs:
                g.position = pos_map.get(g.id, g.position)
            Goal.objects.bulk_update(qs, ["position"])

        return Response(
            {"updated": [{"id": g.id, "position": g.position} for g in qs]},
            status=status.HTTP_200_OK,
        )


class GoalReorderTodayView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        ser = GoalReorderTodaySerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        mode_id = ser.validated_data["mode_id"]
        date = ser.validated_data["date_str"]
        changes = ser.validated_data["changes"]

        ids = [c["id"] for c in changes]
        pos = {c["id"]: c["position"] for c in changes}

        qs = Goal.objects.filter(
            user=request.user,
            mode_id=mode_id,
            due_date=date,
            id__in=ids,
        )

        with transaction.atomic():
            for g in qs:
                g.position = pos.get(g.id, g.position)
            Goal.objects.bulk_update(qs, ["position"])

        return Response({"updated": [{"id": g.id, "position": g.position} for g in qs]})


# ─────────────────────────────────────────────
# PROJECTS
# ─────────────────────────────────────────────
class ProjectViewSet(ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Project.objects.filter(user=self.request.user).order_by("position", "id")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @transaction.atomic
    def perform_update(self, serializer):
        instance: Project = self.get_object()
        old_mode_id = instance.mode_id
        was_completed = instance.is_completed

        updated = serializer.save()

        if (not was_completed) and updated.is_completed:
            stop_active_if_targeting(user=self.request.user, project_id=updated.id)

        if old_mode_id != updated.mode_id:
            updated.cascade_mode_to_descendants()

    def perform_destroy(self, instance: Project) -> None:
        # ✅ stop timer if targeting this project (symmetry with perform_update)
        stopped = stop_active_if_targeting(user=self.request.user, project_id=instance.id)

        # ✅ NEW: soft-delete comments attached to this project
        soft_delete_comments_for_instance(user=self.request.user, instance=instance)

        destroy_or_archive("project", instance)


class ProjectBulkUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        project_ids = request.data.get("projectIds")
        due_date = request.data.get("dueDate")
        mode_id = request.data.get("modeId")

        if not project_ids:
            return Response({"error": "Missing projectIds"}, status=400)

        projects = Project.objects.filter(user=request.user, id__in=project_ids)
        for project in projects:
            old_mode_id = project.mode_id

            if due_date is not None:
                project.due_date = due_date
            if mode_id is not None:
                project.mode_id = mode_id

            project.save()

            if mode_id is not None and old_mode_id != project.mode_id:
                project.cascade_mode_to_descendants()

        return Response(
            ProjectSerializer(projects, many=True).data,
            status=status.HTTP_200_OK,
        )


class ProjectReorderTodayView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        ser = ProjectReorderTodaySerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        mode_id = ser.validated_data["mode_id"]
        date = ser.validated_data["date_str"]
        changes = ser.validated_data["changes"]

        ids = [c["id"] for c in changes]
        pos = {c["id"]: c["position"] for c in changes}

        qs = Project.objects.filter(
            user=request.user,
            mode_id=mode_id,
            due_date=date,
            id__in=ids,
        )

        with transaction.atomic():
            for p in qs:
                p.position = pos.get(p.id, p.position)
            Project.objects.bulk_update(qs, ["position"])

        return Response({"updated": [{"id": p.id, "position": p.position} for p in qs]})


class ProjectReorderHomeView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        serializer = ProjectReorderHomeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        mode_id = serializer.validated_data["mode_id"]
        container = serializer.validated_data["container"]
        changes = serializer.validated_data["changes"]

        container_kind = container["kind"]
        container_id = container["id"]

        filter_kwargs = {
            "user": request.user,
            "mode_id": mode_id,
        }

        if container_kind == "project":
            filter_kwargs["parent_id"] = container_id

        elif container_kind == "goal":
            filter_kwargs["goal_id"] = container_id
            filter_kwargs["parent_id__isnull"] = True

        elif container_kind == "mode":
            filter_kwargs["parent_id__isnull"] = True
            filter_kwargs["goal_id__isnull"] = True

        else:
            return Response(
                {"detail": "Invalid container kind."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ids = [c["id"] for c in changes]
        pos_map = {c["id"]: c["position"] for c in changes}

        with transaction.atomic():
            qs = Project.objects.filter(id__in=ids, **filter_kwargs)
            for p in qs:
                p.position = pos_map.get(p.id, p.position)
            Project.objects.bulk_update(qs, ["position"])

        return Response(
            {"updated": [{"id": p.id, "position": p.position} for p in qs]},
            status=status.HTTP_200_OK,
        )


# ─────────────────────────────────────────────
# MILESTONES
# ─────────────────────────────────────────────
class MilestoneViewSet(ModelViewSet):
    serializer_class = MilestoneSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Milestone.objects.filter(user=self.request.user)
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    @transaction.atomic
    def perform_update(self, serializer):
        instance: Milestone = self.get_object()
        old_mode_id = instance.mode_id
        was_completed = instance.is_completed

        updated = serializer.save()

        if (not was_completed) and updated.is_completed:
            stop_active_if_targeting(user=self.request.user, milestone_id=updated.id)

        if old_mode_id != updated.mode_id:
            updated.cascade_mode_to_descendants()

    def perform_destroy(self, instance: Milestone) -> None:
        # ✅ stop timer if targeting this milestone (symmetry with perform_update)
        stopped = stop_active_if_targeting(user=self.request.user, milestone_id=instance.id)

        # ✅ NEW: soft-delete comments attached to this milestone
        soft_delete_comments_for_instance(user=self.request.user, instance=instance)

        destroy_or_archive("milestone", instance)



class MilestoneReorderTodayView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        ser = MilestoneReorderTodaySerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        mode_id = ser.validated_data["mode_id"]
        date = ser.validated_data["date_str"]
        changes = ser.validated_data["changes"]

        ids = [c["id"] for c in changes]
        pos = {c["id"]: c["position"] for c in changes}

        qs = Milestone.objects.filter(
            user=request.user,
            mode_id=mode_id,
            due_date=date,
            id__in=ids,
        )

        with transaction.atomic():
            for m in qs:
                m.position = pos.get(m.id, m.position)
            Milestone.objects.bulk_update(qs, ["position"])

        return Response({"updated": [{"id": m.id, "position": m.position} for m in qs]})


class BulkMilestonePositionUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        for update in request.data:
            try:
                milestone = Milestone.objects.get(user=request.user, id=update["id"])
                milestone.position = update["position"]
                milestone.save()
            except Milestone.DoesNotExist:
                continue
        return Response(status=status.HTTP_204_NO_CONTENT)


class MilestoneBulkUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        milestone_ids = request.data.get("milestoneIds")
        due_date = request.data.get("dueDate")
        mode_id = request.data.get("modeId")

        if not milestone_ids:
            return Response({"error": "Missing milestoneIds"}, status=400)

        milestones = Milestone.objects.filter(user=request.user, id__in=milestone_ids)
        for milestone in milestones:
            old_mode_id = milestone.mode_id

            if due_date is not None:
                milestone.due_date = due_date
            if mode_id is not None:
                milestone.mode_id = mode_id

            milestone.save()

            if mode_id is not None and old_mode_id != milestone.mode_id:
                milestone.cascade_mode_to_descendants()

        return Response(
            MilestoneSerializer(milestones, many=True).data,
            status=status.HTTP_200_OK,
        )


class MilestoneReorderHomeView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        serializer = MilestoneReorderHomeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        mode_id = serializer.validated_data["mode_id"]
        container = serializer.validated_data["container"]
        changes = serializer.validated_data["changes"]

        container_kind = container["kind"]
        container_id = container["id"]

        filter_kwargs = {
            "user": request.user,
            "mode_id": mode_id,
        }

        if container_kind == "milestone":
            filter_kwargs["parent_id"] = container_id

        elif container_kind == "project":
            filter_kwargs["project_id"] = container_id
            filter_kwargs["parent_id__isnull"] = True

        elif container_kind == "goal":
            filter_kwargs["goal_id"] = container_id
            filter_kwargs["parent_id__isnull"] = True
            filter_kwargs["project_id__isnull"] = True

        elif container_kind == "mode":
            filter_kwargs["parent_id__isnull"] = True
            filter_kwargs["project_id__isnull"] = True
            filter_kwargs["goal_id__isnull"] = True

        else:
            return Response(
                {"detail": "Invalid container kind."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ids = [c["id"] for c in changes]
        pos_map = {c["id"]: c["position"] for c in changes}

        with transaction.atomic():
            qs = Milestone.objects.filter(id__in=ids, **filter_kwargs)
            for m in qs:
                m.position = pos_map.get(m.id, m.position)
            Milestone.objects.bulk_update(qs, ["position"])

        return Response(
            {"updated": [{"id": m.id, "position": m.position} for m in qs]},
            status=status.HTTP_200_OK,
        )


# ─────────────────────────────────────────────
# TASKS
# ─────────────────────────────────────────────
class TaskViewSet(ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Task.objects.filter(user=self.request.user).order_by("position", "id")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @transaction.atomic
    def perform_update(self, serializer):
        instance: Task = self.get_object()
        was_completed = instance.is_completed

        updated = serializer.save()

        logger.warning("🔥 TaskViewSet.perform_update hit id=%s was_completed=%s now_completed=%s", instance.id, was_completed, updated.is_completed)

        if (not was_completed) and updated.is_completed:
            stopped = stop_active_if_targeting(user=self.request.user, task_id=updated.id)
            logger.warning("🛑 stop_active_if_targeting(task_id=%s) -> %s", updated.id, bool(stopped))

    def perform_destroy(self, instance: Task) -> None:
        logger.warning("🔥 TaskViewSet.perform_destroy hit id=%s", instance.id)

        # ✅ stop timer if targeting this task (you already do this)
        stopped = stop_active_if_targeting(user=self.request.user, task_id=instance.id)
        logger.warning("🛑 stop_active_if_targeting(task_id=%s) -> %s", instance.id, bool(stopped))

        # ✅ NEW: soft-delete comments attached to this task
        soft_delete_comments_for_instance(user=self.request.user, instance=instance)

        # ✅ preserve your archive/delete behavior
        destroy_or_archive("task", instance)


    def update(self, request, *args, **kwargs):
        logger.warning(
            "🔥 TaskViewSet.update hit id=%s payload=%s",
            kwargs.get("pk"),
            request.data,
        )
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        logger.warning(
            "🔥 TaskViewSet.partial_update hit id=%s payload=%s",
            kwargs.get("pk"),
            request.data,
        )
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        logger.warning("🔥 TaskViewSet.destroy hit id=%s", kwargs.get("pk"))
        return super().destroy(request, *args, **kwargs)


class TaskBulkUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        task_ids = request.data.get("taskIds")
        due_date = request.data.get("dueDate")
        mode_id = request.data.get("modeId")

        if not task_ids:
            return Response({"error": "Missing taskIds"}, status=400)

        tasks = Task.objects.filter(user=request.user, id__in=task_ids)
        for task in tasks:
            if due_date is not None:
                task.due_date = due_date
            if mode_id is not None:
                task.mode_id = mode_id
            task.save()

        return Response(
            TaskSerializer(tasks, many=True).data,
            status=status.HTTP_200_OK,
        )


class TaskReorderTodayView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        serializer = TaskReorderTodaySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        mode_id = serializer.validated_data["mode_id"]
        date = serializer.validated_data["date"]
        changes = serializer.validated_data["changes"]

        task_ids = [c["id"] for c in changes]
        position_map = {c["id"]: c["position"] for c in changes}

        filter_kwargs = {
            "user": request.user,
            "is_completed": False,
            "mode_id": mode_id,
            "due_date": date,
        }

        with transaction.atomic():
            tasks = Task.objects.filter(id__in=task_ids, **filter_kwargs)
            for task in tasks:
                task.position = position_map.get(task.id, task.position)
            Task.objects.bulk_update(tasks, ["position"])

        return Response(
            {"updated": [{"id": t.id, "position": t.position} for t in tasks]},
            status=status.HTTP_200_OK,
        )


class BulkTaskPositionUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        for update in request.data:
            try:
                task = Task.objects.get(user=request.user, id=update["id"])
                task.position = update["position"]
                task.save()
            except Task.DoesNotExist:
                continue
        return Response(status=status.HTTP_204_NO_CONTENT)


class TaskReorderHomeView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        serializer = TaskReorderHomeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        mode_id = serializer.validated_data["mode_id"]
        container = serializer.validated_data["container"]
        changes = serializer.validated_data["changes"]

        container_kind = container["kind"]
        container_id = container["id"]

        filter_kwargs = {
            "user": request.user,
            "is_completed": False,
            "due_date__isnull": True,
            "mode_id": mode_id,
        }

        if container_kind == "milestone":
            filter_kwargs["milestone_id"] = container_id

        elif container_kind == "project":
            filter_kwargs["project_id"] = container_id
            filter_kwargs["milestone_id__isnull"] = True

        elif container_kind == "goal":
            filter_kwargs["goal_id"] = container_id
            filter_kwargs["milestone_id__isnull"] = True
            filter_kwargs["project_id__isnull"] = True

        elif container_kind == "mode":
            filter_kwargs["milestone_id__isnull"] = True
            filter_kwargs["project_id__isnull"] = True
            filter_kwargs["goal_id__isnull"] = True

        else:
            return Response(
                {"detail": "Invalid container kind."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        task_ids = [c["id"] for c in changes]
        position_map = {c["id"]: c["position"] for c in changes}

        with transaction.atomic():
            tasks = Task.objects.filter(id__in=task_ids, **filter_kwargs)
            for task in tasks:
                task.position = position_map.get(task.id, task.position)
            Task.objects.bulk_update(tasks, ["position"])

        return Response(
            {"updated": [{"id": t.id, "position": t.position} for t in tasks]},
            status=status.HTTP_200_OK,
        )
