# templates/services.py
from django.db import transaction
from core.models import Project, Milestone, Task
from core.services.ordering import (
    assign_end_position_for_project,
    assign_end_position_for_milestone,
    assign_end_position_for_task,
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

    # Tasks
    for task_title in data.get("tasks", []):
        if not task_title or not task_title.strip():
            continue
        task_pos = assign_end_position_for_task({
            "mode_id": mode_id,
            "project_id": project.id,
        })
        Task.objects.create(
            title=task_title.strip(),
            user=user,
            mode_id=mode_id,
            project=project,
            position=task_pos,
        )

    # Sub-milestones under this project
    for ms_data in data.get("subMilestones", []):
        _create_milestone_recursive(
            user, ms_data, mode_id,
            parent_type="project", parent_id=project.id,
        )

    # Sub-projects
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

    # Tasks
    for task_title in data.get("tasks", []):
        if not task_title or not task_title.strip():
            continue
        task_pos = assign_end_position_for_task({
            "mode_id": mode_id,
            "milestone_id": milestone.id,
        })
        Task.objects.create(
            title=task_title.strip(),
            user=user,
            mode_id=mode_id,
            milestone=milestone,
            position=task_pos,
        )

    # Sub-milestones
    for sub_data in data.get("subMilestones", []):
        _create_milestone_recursive(
            user, sub_data, mode_id,
            parent_type="milestone", parent_id=milestone.id,
        )

    return milestone
