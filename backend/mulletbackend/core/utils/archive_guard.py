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


def destroy_or_archive(kind: EntityKind, instance: ArchivableModel) -> None:
    """
    - If entity has time entries → archive (soft delete)
    - Otherwise → hard delete

    Archiving uses ArchivableModel.archive(), which:
      - sets is_archived=True
      - sets archived_at
      - optionally marks is_completed=True if that field exists
    """
    if has_time_entries_for_entity(kind, instance):
        instance.archive(mark_completed=True, save=True)
    else:
        instance.delete()
