# templates/services.py
from django.db import transaction
from core.models import Project, Milestone, Task
from core.services.ordering import (
    POSITION_STEP,
    assign_end_position_for_project,
    assign_end_position_for_milestone,
    scope_qs_for_task,
    next_position,
)


@transaction.atomic
def apply_template_data(user, template_type, data, mode_id):
    """
    Recursively create all entities from template data in a single transaction.
    Returns the top-level created entity (Project or Milestone).
    """
    if template_type == "project":
        return _create_project_recursive(user, data, mode_id, parent_id=None)
    elif template_type == "milestone":
        return _create_milestone_recursive(user, data, mode_id, parent_type=None, parent_id=None)
    else:
        raise ValueError(f"Unsupported template type: {template_type}")


def _bulk_create_tasks(user, task_titles, mode_id, project=None, milestone=None):
    """Create all tasks in one bulk_create call with sequential positions."""
    titles = [t.strip() for t in task_titles if t and t.strip()]
    if not titles:
        return

    # One DB query for starting position
    scope_data = {"mode_id": mode_id}
    if milestone:
        scope_data["milestone_id"] = milestone.id
    elif project:
        scope_data["project_id"] = project.id
    base_pos = next_position(scope_qs_for_task(scope_data))

    tasks = [
        Task(
            title=title,
            user=user,
            mode_id=mode_id,
            project=project,
            milestone=milestone,
            position=base_pos + i * POSITION_STEP,
        )
        for i, title in enumerate(titles)
    ]
    Task.objects.bulk_create(tasks)


def _create_project_recursive(user, data, mode_id, parent_id=None):
    pos_data = {"mode_id": mode_id, "parent_id": parent_id}
    position = assign_end_position_for_project(pos_data)

    project = Project.objects.create(
        title=data.get("title") or "Untitled Project",
        description=data.get("description", ""),
        user=user,
        mode_id=mode_id,
        parent_id=parent_id,
        position=position,
    )

    _bulk_create_tasks(user, data.get("tasks", []), mode_id, project=project)

    for ms_data in data.get("subMilestones", []):
        _create_milestone_recursive(
            user, ms_data, mode_id,
            parent_type="project", parent_id=project.id,
        )

    for sp_data in data.get("subProjects", []):
        _create_project_recursive(user, sp_data, mode_id, parent_id=project.id)

    return project


def _create_milestone_recursive(user, data, mode_id, parent_type=None, parent_id=None):
    project_id = parent_id if parent_type == "project" else None
    ms_parent_id = parent_id if parent_type == "milestone" else None

    pos_data = {
        "mode_id": mode_id,
        "project_id": project_id,
        "parent_id": ms_parent_id,
    }
    position = assign_end_position_for_milestone(pos_data)

    milestone = Milestone.objects.create(
        title=data.get("title") or "Untitled Milestone",
        user=user,
        mode_id=mode_id,
        project_id=project_id,
        parent_id=ms_parent_id,
        position=position,
    )

    _bulk_create_tasks(user, data.get("tasks", []), mode_id, milestone=milestone)

    for sub_data in data.get("subMilestones", []):
        _create_milestone_recursive(
            user, sub_data, mode_id,
            parent_type="milestone", parent_id=milestone.id,
        )

    return milestone
