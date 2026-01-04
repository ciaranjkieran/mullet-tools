# core/services/ordering.py
from typing import Dict
from django.db.models import Max, QuerySet
from core.models import Task, Milestone, Project, Goal  # ← add Goal here

POSITION_STEP = 1024

# ──────────────────────────────────────────────────────────────────────────────
# Shared helpers
# ──────────────────────────────────────────────────────────────────────────────

def next_position(qs: QuerySet, step: int = POSITION_STEP) -> int:
    max_pos = qs.aggregate(m=Max("position"))["m"]
    return (max_pos or 0) + step

def _get(v, key, default=None):
    # tiny helper to avoid KeyError on validated dicts
    return v.get(key, default)

# ──────────────────────────────────────────────────────────────────────────────
# TASKS
# ──────────────────────────────────────────────────────────────────────────────

def scope_qs_for_task(data: Dict) -> QuerySet[Task]:
    qs = Task.objects.filter(mode_id=data["mode_id"], is_completed=False)
    milestone_id = _get(data, "milestone_id")
    project_id   = _get(data, "project_id")
    goal_id      = _get(data, "goal_id")

    if milestone_id:
        qs = qs.filter(milestone_id=milestone_id)
    elif project_id:
        qs = qs.filter(project_id=project_id, milestone_id__isnull=True)
    elif goal_id:
        qs = qs.filter(goal_id=goal_id, project_id__isnull=True, milestone_id__isnull=True)
    else:
        qs = qs.filter(goal_id__isnull=True, project_id__isnull=True, milestone_id__isnull=True)

    # Optionally restrict “home”:
    # qs = qs.filter(due_date__isnull=True)
    return qs

def assign_end_position_for_task(validated: Dict) -> int:
    return next_position(scope_qs_for_task(validated))

def container_changed_for_task(task: Task, validated: Dict) -> bool:
    for f in ("milestone_id", "project_id", "goal_id", "mode_id"):
        if f in validated and getattr(task, f) != validated[f]:
            return True
    return False

# ──────────────────────────────────────────────────────────────────────────────
# MILESTONES
# ──────────────────────────────────────────────────────────────────────────────

def scope_qs_for_milestone(data: Dict) -> QuerySet[Milestone]:
    qs = Milestone.objects.filter(mode_id=data["mode_id"])
    parent_id  = _get(data, "parent_id")
    project_id = _get(data, "project_id")
    goal_id    = _get(data, "goal_id")

    if parent_id is not None:
        qs = qs.filter(parent_id=parent_id)
    elif project_id:
        qs = qs.filter(project_id=project_id, parent_id__isnull=True)
    elif goal_id:
        qs = qs.filter(goal_id=goal_id, project_id__isnull=True, parent_id__isnull=True)
    else:
        qs = qs.filter(project_id__isnull=True, goal_id__isnull=True, parent_id__isnull=True)

    # Optionally restrict “home”:
    # qs = qs.filter(due_date__isnull=True)
    return qs

def assign_end_position_for_milestone(validated: Dict) -> int:
    return next_position(scope_qs_for_milestone(validated))

def container_changed_for_milestone(m: Milestone, validated: Dict) -> bool:
    for f in ("parent_id", "project_id", "goal_id", "mode_id"):
        if f in validated and getattr(m, f) != validated[f]:
            return True
    return False

# ──────────────────────────────────────────────────────────────────────────────
# PROJECTS
# ──────────────────────────────────────────────────────────────────────────────

def scope_qs_for_project(data: Dict) -> QuerySet[Project]:
    qs = Project.objects.filter(mode_id=data["mode_id"])
    parent_id = _get(data, "parent_id")
    goal_id   = _get(data, "goal_id")

    if parent_id is not None:
        qs = qs.filter(parent_id=parent_id)
    elif goal_id:
        qs = qs.filter(goal_id=goal_id, parent_id__isnull=True)
    else:
        qs = qs.filter(goal_id__isnull=True, parent_id__isnull=True)

    # Optionally restrict “home”:
    # qs = qs.filter(due_date__isnull=True)
    # qs = qs.filter(is_completed=False)
    return qs

def assign_end_position_for_project(validated: Dict) -> int:
    return next_position(scope_qs_for_project(validated))

def container_changed_for_project(p: Project, validated: Dict) -> bool:
    for f in ("parent_id", "goal_id", "mode_id"):
        if f in validated and getattr(p, f) != validated[f]:
            return True
    return False

# ──────────────────────────────────────────────────────────────────────────────
# GOALS (flat under Mode)
# ──────────────────────────────────────────────────────────────────────────────

def scope_qs_for_goal(data: Dict) -> QuerySet[Goal]:
    """
    Goals are flat: they only live directly under a Mode.
    """
    qs = Goal.objects.filter(mode_id=data["mode_id"])
    # If your HomeView excludes scheduled or completed, enable as needed:
    # qs = qs.filter(due_date__isnull=True)
    # qs = qs.filter(is_completed=False)
    return qs

def assign_end_position_for_goal(validated: Dict) -> int:
    return next_position(scope_qs_for_goal(validated))

def container_changed_for_goal(g: Goal, validated: Dict) -> bool:
    # Only the mode can change for goals
    if "mode_id" in validated and g.mode_id != validated["mode_id"]:
        return True
    return False
