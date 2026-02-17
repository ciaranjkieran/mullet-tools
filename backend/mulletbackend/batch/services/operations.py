from __future__ import annotations

from typing import Dict, List, Optional, TypedDict

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q

from core.models import Goal, Milestone, Mode, Project, Task
from core.utils.archive_guard import destroy_or_archive
from comments.services import soft_delete_comments_for_instance
from timers.services import stop_active_if_targeting


class Selected(TypedDict, total=False):
    task: List[int]
    milestone: List[int]
    project: List[int]
    goal: List[int]


def _require_user(user):
    if user is None or getattr(user, "is_anonymous", False):
        raise ValidationError("User is required.")
    return user


def _validate_mode_ownership(*, user, mode_id: int) -> Mode:
    try:
        return Mode.objects.get(user=user, id=mode_id)
    except Mode.DoesNotExist:
        raise ValidationError("Mode not found for user.")


def _stop_and_cleanup_then_archive(*, user, kind: str, instance) -> None:
    # stop any active timer targeting this entity
    stop_active_if_targeting(user=user, **{f"{kind}_id": instance.id})

    # soft-delete comments attached to this entity
    soft_delete_comments_for_instance(user=user, instance=instance)

    # archive or hard-delete depending on time entries
    destroy_or_archive(kind, instance)


def _get_parent(*, user, parent_type: str, parent_id: int):
    if parent_type == "goal":
        parent = Goal.all_objects.filter(user=user, id=parent_id).first()
    elif parent_type == "project":
        parent = Project.all_objects.filter(user=user, id=parent_id).first()
    elif parent_type == "milestone":
        parent = Milestone.all_objects.filter(user=user, id=parent_id).first()
    else:
        parent = None

    if not parent:
        raise ValidationError("Parent not found for user.")
    return parent


@transaction.atomic
def do_complete(selected: Selected, *, user) -> Dict[str, int]:
    user = _require_user(user)
    completed = {"task": 0, "milestone": 0, "project": 0, "goal": 0}

    if ids := selected.get("task"):
        for t in Task.objects.filter(user=user, id__in=ids):
            _stop_and_cleanup_then_archive(user=user, kind="task", instance=t)
            completed["task"] += 1

    if ids := selected.get("milestone"):
        for m in Milestone.objects.filter(user=user, id__in=ids):
            _stop_and_cleanup_then_archive(user=user, kind="milestone", instance=m)
            completed["milestone"] += 1

    if ids := selected.get("project"):
        for p in Project.objects.filter(user=user, id__in=ids):
            _stop_and_cleanup_then_archive(user=user, kind="project", instance=p)
            completed["project"] += 1

    if ids := selected.get("goal"):
        for g in Goal.objects.filter(user=user, id__in=ids):
            _stop_and_cleanup_then_archive(user=user, kind="goal", instance=g)
            completed["goal"] += 1

    return completed


@transaction.atomic
def do_delete(selected: Selected, *, user) -> Dict[str, int]:
    """
    Delete is treated as "checkbox-delete": archive if referenced by TimeEntry, else hard delete.
    Also stops timers + deletes comments, to match your other behavior.
    """
    user = _require_user(user)
    deleted = {"task": 0, "milestone": 0, "project": 0, "goal": 0}

    if ids := selected.get("task"):
        for t in Task.all_objects.filter(user=user, id__in=ids):
            _stop_and_cleanup_then_archive(user=user, kind="task", instance=t)
            deleted["task"] += 1

    if ids := selected.get("milestone"):
        for m in Milestone.all_objects.filter(user=user, id__in=ids):
            _stop_and_cleanup_then_archive(user=user, kind="milestone", instance=m)
            deleted["milestone"] += 1

    if ids := selected.get("project"):
        for p in Project.all_objects.filter(user=user, id__in=ids):
            _stop_and_cleanup_then_archive(user=user, kind="project", instance=p)
            deleted["project"] += 1

    if ids := selected.get("goal"):
        for g in Goal.all_objects.filter(user=user, id__in=ids):
            _stop_and_cleanup_then_archive(user=user, kind="goal", instance=g)
            deleted["goal"] += 1

    return deleted


@transaction.atomic
def do_change_mode(selected: Selected, mode_id: int, *, user) -> Dict[str, int]:
    """
    Change mode AND drop parent relationships that could become invalid.
    Validates the target mode belongs to the user.
    """
    user = _require_user(user)
    _validate_mode_ownership(user=user, mode_id=mode_id)

    changed = {"task": 0, "milestone": 0, "project": 0, "goal": 0}

    if ids := selected.get("task"):
        changed["task"] = Task.objects.filter(user=user, id__in=ids).update(
            mode_id=mode_id,
            goal_id=None,
            project_id=None,
            milestone_id=None,
        )

    if ids := selected.get("milestone"):
        changed["milestone"] = Milestone.objects.filter(user=user, id__in=ids).update(
            mode_id=mode_id,
            goal_id=None,
            project_id=None,
            parent_id=None,
        )

    if ids := selected.get("project"):
        changed["project"] = Project.objects.filter(user=user, id__in=ids).update(
            mode_id=mode_id,
            goal_id=None,
            parent_id=None,
        )

    if ids := selected.get("goal"):
        changed["goal"] = Goal.objects.filter(user=user, id__in=ids).update(
            mode_id=mode_id,
        )

    return changed


@transaction.atomic
def do_schedule(selected: Selected, payload: Dict[str, object], *, user) -> Dict[str, int]:
    user = _require_user(user)

    if not payload:
        return {"task": 0, "milestone": 0, "project": 0, "goal": 0}

    changed = {"task": 0, "milestone": 0, "project": 0, "goal": 0}

    if ids := selected.get("task"):
        changed["task"] = Task.objects.filter(user=user, id__in=ids).update(**payload)
    if ids := selected.get("milestone"):
        changed["milestone"] = Milestone.objects.filter(user=user, id__in=ids).update(**payload)
    if ids := selected.get("project"):
        changed["project"] = Project.objects.filter(user=user, id__in=ids).update(**payload)
    if ids := selected.get("goal"):
        changed["goal"] = Goal.objects.filter(user=user, id__in=ids).update(**payload)

    return changed


@transaction.atomic
def do_group_under(selected: Selected, parent_type: str, parent_id: int, *, user) -> Dict[str, int]:
    user = _require_user(user)
    parent = _get_parent(user=user, parent_type=parent_type, parent_id=parent_id)

    changed = {"task": 0, "milestone": 0, "project": 0}

    # Enforce "can't group across modes"
    parent_mode_id = parent.mode_id
    if not parent_mode_id:
        raise ValidationError("Parent has no mode set.")

    if parent_type == "goal":
        if ids := selected.get("task"):
            changed["task"] = Task.objects.filter(user=user, id__in=ids).update(
                mode_id=parent_mode_id,
                goal_id=parent_id,
                project_id=None,
                milestone_id=None,
            )
        if ids := selected.get("milestone"):
            changed["milestone"] = Milestone.objects.filter(user=user, id__in=ids).update(
                mode_id=parent_mode_id,
                goal_id=parent_id,
                project_id=None,
                parent_id=None,
            )
        if ids := selected.get("project"):
            changed["project"] = Project.objects.filter(user=user, id__in=ids).update(
                mode_id=parent_mode_id,
                goal_id=parent_id,
                parent_id=None,
            )

    elif parent_type == "project":
        if ids := selected.get("task"):
            changed["task"] = Task.objects.filter(user=user, id__in=ids).update(
                mode_id=parent_mode_id,
                project_id=parent_id,
                goal_id=None,
                milestone_id=None,
            )
        if ids := selected.get("milestone"):
            changed["milestone"] = Milestone.objects.filter(user=user, id__in=ids).update(
                mode_id=parent_mode_id,
                project_id=parent_id,
                goal_id=None,
                parent_id=None,
            )
        if ids := selected.get("project"):
            changed["project"] = Project.objects.filter(user=user, id__in=ids).update(
                mode_id=parent_mode_id,
                parent_id=parent_id,
                goal_id=None,
            )

    elif parent_type == "milestone":
        if ids := selected.get("task"):
            changed["task"] = Task.objects.filter(user=user, id__in=ids).update(
                mode_id=parent_mode_id,
                milestone_id=parent_id,
                goal_id=None,
                project_id=None,
            )
        if ids := selected.get("milestone"):
            changed["milestone"] = Milestone.objects.filter(user=user, id__in=ids).update(
                mode_id=parent_mode_id,
                parent_id=parent_id,
                goal_id=None,
                project_id=None,
            )

    else:
        raise ValidationError("Invalid parentType.")

    return changed
