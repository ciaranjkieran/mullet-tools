from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Mode, Goal, Project, Milestone, Task

User = get_user_model()
from core.services.ordering import (
    assign_end_position_for_task,
    container_changed_for_task,
    assign_end_position_for_milestone,
    container_changed_for_milestone,
    assign_end_position_for_project,
    container_changed_for_project,
    assign_end_position_for_goal,
    container_changed_for_goal,
)

from core.validators import validate_at_most_one, validate_mode_matches_ancestor


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────
def _null_if_blank(v):
    return None if v == "" else v


def _merged(serializer, data):
    """
    For PATCH validation: merge incoming attrs with instance fields
    so validators can see the "effective" result.
    """
    if getattr(serializer, "instance", None):
        current = {
            f.name: getattr(serializer.instance, f.name)
            for f in serializer.Meta.model._meta.fields
        }
        return {**current, **data}
    return data


# ─────────────────────────────────────────────
# MODE
# ─────────────────────────────────────────────
class ModeSerializer(serializers.ModelSerializer):
    isOwned = serializers.SerializerMethodField()
    collaboratorCount = serializers.SerializerMethodField()
    ownerName = serializers.SerializerMethodField()

    class Meta:
        model = Mode
        fields = ["id", "title", "color", "position", "isOwned", "collaboratorCount", "ownerName"]

    def validate_position(self, value):
        if value < 0:
            raise serializers.ValidationError("position must be >= 0")
        return value

    def get_isOwned(self, obj):
        request = self.context.get("request")
        if not request:
            return True
        return obj.user_id == request.user.id

    def get_collaboratorCount(self, obj):
        if hasattr(obj, "_collaborator_count"):
            return obj._collaborator_count
        return obj.collaborators.count()

    def get_ownerName(self, obj):
        request = self.context.get("request")
        if not request or obj.user_id == request.user.id:
            return None
        profile = getattr(obj.user, "profile", None)
        if profile and profile.display_name:
            return profile.display_name
        return obj.user.username


# ─────────────────────────────────────────────
# ASSIGNEE (read-only nested user data)
# ─────────────────────────────────────────────
class AssigneeSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(read_only=True)
    displayName = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()

    def get_displayName(self, user):
        profile = getattr(user, "profile", None)
        if profile and profile.display_name:
            return profile.display_name
        return user.username

    def get_avatar(self, user):
        profile = getattr(user, "profile", None)
        if profile and profile.avatar:
            return profile.avatar.url
        return None


def _validate_assignee_access(attrs, instance=None):
    """
    If assigned_to is being set, verify the user has access to the entity's mode.
    """
    assigned_to = attrs.get("assigned_to")
    if assigned_to is None:
        return
    mode_id = attrs.get("mode_id") or (instance.mode_id if instance else None)
    if not mode_id:
        return
    from collaboration.permissions import accessible_mode_ids
    if mode_id not in accessible_mode_ids(assigned_to):
        raise serializers.ValidationError(
            {"assignedToId": "This user does not have access to the entity's mode."}
        )


# ─────────────────────────────────────────────
# GOAL
# ─────────────────────────────────────────────
class GoalSerializer(serializers.ModelSerializer):
    isCompleted = serializers.BooleanField(
        source="is_completed", required=False, default=False
    )
    dueDate = serializers.DateField(source="due_date", allow_null=True, required=False)
    dueTime = serializers.TimeField(
        source="due_time",
        allow_null=True,
        required=False,
        input_formats=["%H:%M", "%H:%M:%S"],
    )
    description = serializers.CharField(
        allow_blank=True, allow_null=True, required=False
    )

    modeId = serializers.IntegerField(source="mode_id", allow_null=True, required=False)

    assignedToId = serializers.PrimaryKeyRelatedField(
        source="assigned_to",
        queryset=User.objects.all(),
        allow_null=True,
        required=False,
    )
    assignee = AssigneeSerializer(source="assigned_to", read_only=True)

    class Meta:
        model = Goal
        fields = [
            "id",
            "title",
            "description",
            "isCompleted",
            "dueDate",
            "dueTime",
            "position",
            "modeId",
            "assignedToId",
            "assignee",
        ]
        read_only_fields = ("position",)

    def validate(self, attrs):
        if "due_date" in attrs:
            attrs["due_date"] = _null_if_blank(attrs["due_date"])
        if "due_time" in attrs:
            attrs["due_time"] = _null_if_blank(attrs["due_time"])
        _validate_assignee_access(attrs, self.instance)
        return attrs

    def create(self, validated_data):
        validated_data["position"] = assign_end_position_for_goal(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if container_changed_for_goal(instance, validated_data):
            validated_data.setdefault("mode_id", instance.mode_id)
            validated_data["position"] = assign_end_position_for_goal(validated_data)
        return super().update(instance, validated_data)


# ─────────────────────────────────────────────
# PROJECT
# ─────────────────────────────────────────────
class ProjectSerializer(serializers.ModelSerializer):
    isCompleted = serializers.BooleanField(
        source="is_completed", required=False, default=False
    )
    dueDate = serializers.DateField(source="due_date", allow_null=True, required=False)
    dueTime = serializers.TimeField(
        source="due_time",
        allow_null=True,
        required=False,
        input_formats=["%H:%M", "%H:%M:%S"],
    )
    description = serializers.CharField(
        allow_blank=True, allow_null=True, required=False
    )

    parentId = serializers.IntegerField(source="parent_id", allow_null=True, required=False)
    goalId = serializers.IntegerField(source="goal_id", allow_null=True, required=False)
    modeId = serializers.IntegerField(source="mode_id", required=False)

    assignedToId = serializers.PrimaryKeyRelatedField(
        source="assigned_to",
        queryset=User.objects.all(),
        allow_null=True,
        required=False,
    )
    assignee = AssigneeSerializer(source="assigned_to", read_only=True)

    class Meta:
        model = Project
        fields = (
            "id",
            "title",
            "description",
            "isCompleted",
            "dueDate",
            "dueTime",
            "position",
            "parentId",
            "goalId",
            "modeId",
            "assignedToId",
            "assignee",
        )
        read_only_fields = ("position",)

    def validate(self, attrs):
        if "due_date" in attrs:
            attrs["due_date"] = _null_if_blank(attrs["due_date"])
        if "due_time" in attrs:
            attrs["due_time"] = _null_if_blank(attrs["due_time"])

        # ✅ enforce ancestry + mode consistency
        merged = _merged(self, attrs)
        chosen = validate_at_most_one(merged, ["parent", "goal"], entity_name="project")
        validate_mode_matches_ancestor(merged, chosen, entity_name="project")

        _validate_assignee_access(attrs, self.instance)
        return attrs

    def create(self, validated_data):
        validated_data["position"] = assign_end_position_for_project(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if container_changed_for_project(instance, validated_data):
            validated_data.setdefault("mode_id", instance.mode_id)
            validated_data["position"] = assign_end_position_for_project(validated_data)
        return super().update(instance, validated_data)


# ─────────────────────────────────────────────
# TASK
# ─────────────────────────────────────────────
class TaskSerializer(serializers.ModelSerializer):
    isCompleted = serializers.BooleanField(
        source="is_completed", required=False, default=False
    )
    dueDate = serializers.DateField(source="due_date", allow_null=True, required=False)
    dueTime = serializers.TimeField(source="due_time", allow_null=True, required=False)

    milestoneId = serializers.IntegerField(
        source="milestone_id", allow_null=True, required=False
    )
    projectId = serializers.IntegerField(
        source="project_id", allow_null=True, required=False
    )
    goalId = serializers.IntegerField(source="goal_id", allow_null=True, required=False)
    modeId = serializers.IntegerField(source="mode_id")

    assignedToId = serializers.PrimaryKeyRelatedField(
        source="assigned_to",
        queryset=User.objects.all(),
        allow_null=True,
        required=False,
    )
    assignee = AssigneeSerializer(source="assigned_to", read_only=True)

    class Meta:
        model = Task
        fields = (
            "id",
            "title",
            "isCompleted",
            "dueDate",
            "dueTime",
            "position",
            "milestoneId",
            "projectId",
            "goalId",
            "modeId",
            "assignedToId",
            "assignee",
        )
        read_only_fields = ("position",)

    def validate(self, attrs):
        if "due_date" in attrs:
            attrs["due_date"] = _null_if_blank(attrs["due_date"])
        if "due_time" in attrs:
            attrs["due_time"] = _null_if_blank(attrs["due_time"])

        # ✅ enforce ancestry + mode consistency
        merged = _merged(self, attrs)
        chosen = validate_at_most_one(
            merged, ["milestone", "project", "goal"], entity_name="task"
        )
        validate_mode_matches_ancestor(merged, chosen, entity_name="task")

        _validate_assignee_access(attrs, self.instance)
        return attrs

    def create(self, validated_data):
        validated_data["position"] = assign_end_position_for_task(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if container_changed_for_task(instance, validated_data):
            validated_data.setdefault("mode_id", instance.mode_id)
            validated_data["position"] = assign_end_position_for_task(validated_data)
        return super().update(instance, validated_data)


# ─────────────────────────────────────────────
# MILESTONE
# ─────────────────────────────────────────────
class MilestoneSerializer(serializers.ModelSerializer):
    isCompleted = serializers.BooleanField(
        source="is_completed", required=False, default=False
    )
    dueDate = serializers.DateField(source="due_date", allow_null=True, required=False)
    dueTime = serializers.TimeField(source="due_time", allow_null=True, required=False)

    parentId = serializers.IntegerField(source="parent_id", allow_null=True, required=False)
    projectId = serializers.IntegerField(source="project_id", allow_null=True, required=False)
    goalId = serializers.IntegerField(source="goal_id", allow_null=True, required=False)
    modeId = serializers.IntegerField(source="mode_id")

    assignedToId = serializers.PrimaryKeyRelatedField(
        source="assigned_to",
        queryset=User.objects.all(),
        allow_null=True,
        required=False,
    )
    assignee = AssigneeSerializer(source="assigned_to", read_only=True)

    class Meta:
        model = Milestone
        fields = (
            "id",
            "title",
            "isCompleted",
            "dueDate",
            "dueTime",
            "position",
            "parentId",
            "projectId",
            "goalId",
            "modeId",
            "assignedToId",
            "assignee",
        )
        read_only_fields = ("position",)

    def validate(self, attrs):
        if "due_date" in attrs:
            attrs["due_date"] = _null_if_blank(attrs["due_date"])
        if "due_time" in attrs:
            attrs["due_time"] = _null_if_blank(attrs["due_time"])

        # ✅ enforce ancestry + mode consistency
        merged = _merged(self, attrs)
        chosen = validate_at_most_one(
            merged, ["parent", "project", "goal"], entity_name="milestone"
        )
        validate_mode_matches_ancestor(merged, chosen, entity_name="milestone")

        _validate_assignee_access(attrs, self.instance)
        return attrs

    def create(self, validated_data):
        validated_data["position"] = assign_end_position_for_milestone(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if container_changed_for_milestone(instance, validated_data):
            validated_data.setdefault("mode_id", instance.mode_id)
            validated_data["position"] = assign_end_position_for_milestone(validated_data)
        return super().update(instance, validated_data)


# ─────────────────────────────────────────────
# REORDER SERIALIZERS (APIViews)
# ─────────────────────────────────────────────
class ProjectReorderHomeSerializer(serializers.Serializer):
    mode_id = serializers.IntegerField()
    container = serializers.DictField()  # { kind, id }
    changes = serializers.ListField(
        child=serializers.DictField(child=serializers.IntegerField())
    )


class ProjectReorderTodaySerializer(serializers.Serializer):
    mode_id = serializers.IntegerField()
    date_str = serializers.DateField()
    changes = serializers.ListField(child=serializers.DictField())


class TaskReorderHomeSerializer(serializers.Serializer):
    mode_id = serializers.IntegerField()
    container = serializers.DictField()  # { kind, id }
    changes = serializers.ListField(
        child=serializers.DictField(child=serializers.IntegerField())
    )


class TaskReorderTodaySerializer(serializers.Serializer):
    mode_id = serializers.IntegerField()
    date = serializers.DateField()
    changes = serializers.ListField(
        child=serializers.DictField(child=serializers.IntegerField())
    )


class MilestoneReorderHomeSerializer(serializers.Serializer):
    mode_id = serializers.IntegerField()
    container = serializers.DictField()  # { kind, id }
    changes = serializers.ListField(
        child=serializers.DictField(child=serializers.IntegerField())
    )


class MilestoneReorderTodaySerializer(serializers.Serializer):
    mode_id = serializers.IntegerField()
    date_str = serializers.DateField()
    changes = serializers.ListField(child=serializers.DictField())


class GoalReorderHomeSerializer(serializers.Serializer):
    mode_id = serializers.IntegerField()
    container = serializers.DictField()  # { kind, id }
    changes = serializers.ListField(
        child=serializers.DictField(child=serializers.IntegerField())
    )


class GoalReorderTodaySerializer(serializers.Serializer):
    mode_id = serializers.IntegerField()
    date_str = serializers.DateField()
    changes = serializers.ListField(child=serializers.DictField())
