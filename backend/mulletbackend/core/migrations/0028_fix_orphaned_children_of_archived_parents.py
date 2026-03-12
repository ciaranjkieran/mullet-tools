"""
Data migration: detach children whose parent entity is archived.

When a goal/project/milestone was soft-deleted (archived), its children
kept their FK pointing at the now-hidden parent, making them invisible
in the frontend tree.  This migration nulls out those stale FK references
so the children reappear as loose entities under their mode.
"""

from django.db import migrations


def detach_orphans(apps, schema_editor):
    Goal = apps.get_model("core", "Goal")
    Project = apps.get_model("core", "Project")
    Milestone = apps.get_model("core", "Milestone")
    Task = apps.get_model("core", "Task")

    # apps.get_model returns models with the default manager only,
    # so we use .objects which in a migration context is unfiltered.
    archived_goal_ids = set(
        Goal.objects.filter(is_archived=True).values_list("id", flat=True)
    )
    archived_project_ids = set(
        Project.objects.filter(is_archived=True).values_list("id", flat=True)
    )
    archived_milestone_ids = set(
        Milestone.objects.filter(is_archived=True).values_list("id", flat=True)
    )

    # Detach children of archived goals
    if archived_goal_ids:
        Project.objects.filter(goal_id__in=archived_goal_ids).update(goal_id=None)
        Milestone.objects.filter(goal_id__in=archived_goal_ids).update(goal_id=None)
        Task.objects.filter(goal_id__in=archived_goal_ids).update(goal_id=None)

    # Detach children of archived projects
    if archived_project_ids:
        Project.objects.filter(parent_id__in=archived_project_ids).update(parent_id=None)
        Milestone.objects.filter(project_id__in=archived_project_ids).update(project_id=None)
        Task.objects.filter(project_id__in=archived_project_ids).update(project_id=None)

    # Detach children of archived milestones
    if archived_milestone_ids:
        Milestone.objects.filter(parent_id__in=archived_milestone_ids).update(parent_id=None)
        Task.objects.filter(milestone_id__in=archived_milestone_ids).update(milestone_id=None)


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0027_goal_assigned_to_milestone_assigned_to_and_more"),
    ]

    operations = [
        migrations.RunPython(detach_orphans, migrations.RunPython.noop),
    ]
