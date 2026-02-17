# timer/services.py
from __future__ import annotations

import logging
from datetime import datetime
from typing import Dict, Optional

from django.utils import timezone
from django.db import transaction

from core.models import Mode, Goal, Project, Milestone, Task
from .models import ActiveTimer, TimeEntry

log = logging.getLogger("timer")


def resolve_path(*, task=None, milestone=None, project=None, goal=None, mode=None) -> Dict[str, Optional[object]]:
    # deepest wins: task > milestone > project > goal > mode
    if task:
        milestone = task.milestone or milestone
        project = task.project or project
        goal = task.goal or goal
        mode = task.mode or mode

    if milestone and not task:
        project = milestone.project or project
        goal = milestone.goal or goal
        mode = milestone.mode or mode

    if project and not (task or milestone):
        goal = project.goal or goal
        mode = project.mode or mode

    if goal and not (task or milestone or project):
        mode = goal.mode or mode

    return dict(mode=mode, goal=goal, project=project, milestone=milestone, task=task)


def fetch_entities_by_ids(
    *,
    user,
    mode_id=None,
    goal_id=None,
    project_id=None,
    milestone_id=None,
    task_id=None,
):
    """
    IMPORTANT: user-scoped fetch so you can’t point a timer at someone else’s entities.
    """
    mode = Mode.objects.filter(user=user, id=mode_id).first() if mode_id else None
    goal = Goal.objects.filter(user=user, id=goal_id).first() if goal_id else None
    project = Project.objects.filter(user=user, id=project_id).first() if project_id else None
    milestone = Milestone.objects.filter(user=user, id=milestone_id).first() if milestone_id else None
    task = Task.objects.filter(user=user, id=task_id).first() if task_id else None
    return dict(mode=mode, goal=goal, project=project, milestone=milestone, task=task)


def validate_duration_sec(duration_sec) -> int:
    try:
        val = int(duration_sec)
        return val if val > 0 else 0
    except (TypeError, ValueError):
        return 0


def effective_end_for(active: ActiveTimer) -> timezone.datetime:
    now = timezone.now()
    if active.kind == "timer" and active.ends_at:
        return min(now, active.ends_at)
    return now


@transaction.atomic
def close_active_into_entry(
    active: ActiveTimer,
    *,
    force_end: Optional[timezone.datetime] = None,
) -> TimeEntry:
    end = force_end or effective_end_for(active)

    if active.kind == "timer" and active.ends_at:
        end = min(end, active.ends_at)

    if end < active.started_at:
        end = active.started_at

    seconds = round((end - active.started_at).total_seconds())
    if seconds < 1:
        seconds = 1

    entry = TimeEntry.from_active_timer(active, ended_at=end, seconds=seconds, note="")
    entry.save()

    active.delete()
    return entry


def auto_close_expired_if_any(*, user) -> Optional[TimeEntry]:
    active = ActiveTimer.objects.select_for_update().filter(user=user).first()
    if not active:
        return None
    if active.kind == "timer" and active.ends_at and timezone.now() >= active.ends_at:
        return close_active_into_entry(active)
    return None


def slice_active_until(active: ActiveTimer, *, until=None, corr: str = "—"):
    """
    Write TimeEntry for [started_at, until] on the OLD path, then set started_at=until.
    Keeps ends_at / planned_seconds / kind / session_id unchanged.
    """
    if until is None:
        until = timezone.now()

    if active.ends_at and until > active.ends_at:
        log.info("[SLICE][%s] Clamp until %s -> %s", corr, until, active.ends_at)
        until = active.ends_at

    if until <= active.started_at:
        active.started_at = until
        active.save(update_fields=["started_at"])
        log.info("[SLICE][%s] No elapsed; moved started_at -> %s", corr, until)
        return

    elapsed = round((until - active.started_at).total_seconds())
    if elapsed < 0:
        elapsed = 0

    entry_id = None
    if elapsed > 0:
        te = TimeEntry(
            user=active.user,
            kind=active.kind,
            session_id=active.session_id,
            started_at=active.started_at,
            ended_at=until,
            seconds=elapsed,
            planned_seconds=active.planned_seconds,
            mode=active.mode,
            goal=active.goal,
            project=active.project,
            milestone=active.milestone,
            task=active.task,
            note="",
        )
        te.fill_snapshots_from_lineage()
        te.save()
        entry_id = te.id

    active.started_at = until
    active.save(update_fields=["started_at"])

    log.info("[SLICE][%s] wrote entry id=%s elapsed=%ss; new started_at=%s", corr, entry_id, elapsed, active.started_at)

# timer/services.py
from typing import Optional
from django.db import transaction
from .models import ActiveTimer, TimeEntry

@transaction.atomic
def stop_active_if_targeting(*, user, goal_id=None, project_id=None, milestone_id=None, task_id=None) -> Optional[TimeEntry]:
    active = ActiveTimer.objects.select_for_update().filter(user=user).first()
    if not active:
        return None

    if task_id is not None and active.task_id == task_id:
        return close_active_into_entry(active)

    if milestone_id is not None and active.milestone_id == milestone_id:
        return close_active_into_entry(active)

    if project_id is not None and active.project_id == project_id:
        return close_active_into_entry(active)

    if goal_id is not None and active.goal_id == goal_id:
        return close_active_into_entry(active)

    return None
