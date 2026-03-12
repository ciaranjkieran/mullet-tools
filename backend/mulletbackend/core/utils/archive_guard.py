# timer/utils/archive_guard.py
from typing import Protocol, Literal

from django.db.models import Q  # keep if you'll expand to descendants later

from core.models import ArchivableModel  # abstract base with archive()
from timers.models import TimeEntry       # adjust path if your timer app is named differently


class HasId(Protocol):
    id: int


EntityKind = Literal["goal", "project", "milestone", "task"]


def has_time_entries_for_entity(kind: EntityKind, instance: HasId) -> bool:
    """
    First pass: only check direct references from TimeEntry to the entity.
    (We can later upgrade this to 'any descendants' if needed.)
    """
    if kind == "task":
        return TimeEntry.objects.filter(task_id=instance.id).exists()
    if kind == "milestone":
        return TimeEntry.objects.filter(milestone_id=instance.id).exists()
    if kind == "project":
        return TimeEntry.objects.filter(project_id=instance.id).exists()
    if kind == "goal":
        return TimeEntry.objects.filter(goal_id=instance.id).exists()
    return False


def detach_children(kind: EntityKind, instance: ArchivableModel) -> None:
    """
    Null out FK references from children pointing to this entity.
    Mirrors Django's on_delete=SET_NULL behaviour for soft-deletes (archiving),
    where the DB-level CASCADE/SET_NULL doesn't fire.
    """
    from core.models import Project, Milestone, Task

    if kind == "goal":
        Project.all_objects.filter(goal_id=instance.id).update(goal_id=None)
        Milestone.all_objects.filter(goal_id=instance.id).update(goal_id=None)
        Task.all_objects.filter(goal_id=instance.id).update(goal_id=None)
    elif kind == "project":
        Project.all_objects.filter(parent_id=instance.id).update(parent_id=None)
        Milestone.all_objects.filter(project_id=instance.id).update(project_id=None)
        Task.all_objects.filter(project_id=instance.id).update(project_id=None)
    elif kind == "milestone":
        Milestone.all_objects.filter(parent_id=instance.id).update(parent_id=None)
        Task.all_objects.filter(milestone_id=instance.id).update(milestone_id=None)
    # tasks have no children — nothing to detach


def destroy_or_archive(kind: EntityKind, instance: ArchivableModel) -> None:
    """
    - If entity has time entries → archive (soft delete)
    - Otherwise → hard delete

    In both cases, children are detached first so they don't become
    orphans referencing a hidden/deleted parent.

    Archiving uses ArchivableModel.archive(), which:
      - sets is_archived=True
      - sets archived_at
      - optionally marks is_completed=True if that field exists
    """
    detach_children(kind, instance)

    if has_time_entries_for_entity(kind, instance):
        instance.archive(mark_completed=True, save=True)
    else:
        instance.delete()
