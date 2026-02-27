from django.db import models
from django.db.models import Q, CheckConstraint, Index
from django.utils import timezone
from django.conf import settings


class Mode(models.Model):
    title = models.CharField(max_length=255)
    color = models.CharField(max_length=20, default="#000000")
    position = models.IntegerField(default=0)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="modes",
    )

    class Meta:
        ordering = ["position", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "position"], name="unique_mode_position_per_user"
            ),
        ]

    def __str__(self):
        return self.title


# ─────────────────────────────────────────────
# Archiving / soft-delete infrastructure
# ─────────────────────────────────────────────


class ArchivableQuerySet(models.QuerySet):
    def active(self):
        return self.filter(is_archived=False)

    def archived(self):
        return self.filter(is_archived=True)


class ArchivableManager(models.Manager):
    """Default manager: only non-archived rows."""

    def get_queryset(self):
        return ArchivableQuerySet(self.model, using=self._db).active()

    def archived(self):
        return ArchivableQuerySet(self.model, using=self._db).archived()


class AllObjectsManager(models.Manager):
    """Secondary manager: includes archived rows."""

    def get_queryset(self):
        return ArchivableQuerySet(self.model, using=self._db)


class ArchivableModel(models.Model):
    is_archived = models.BooleanField(default=False, db_index=True)
    archived_at = models.DateTimeField(null=True, blank=True)

    objects = ArchivableManager()
    all_objects = AllObjectsManager()

    class Meta:
        abstract = True

    def archive(self, *, mark_completed: bool = True, save: bool = True):
        """
        Soft-delete this instance:
        - flip is_archived = True
        - set archived_at
        - optionally mark is_completed=True if the model has that field
        """
        if mark_completed and hasattr(self, "is_completed"):
            setattr(self, "is_completed", True)

        self.is_archived = True
        self.archived_at = timezone.now()

        if save:
            update_fields = ["is_archived", "archived_at"]
            if hasattr(self, "is_completed"):
                update_fields.append("is_completed")
            self.save(update_fields=update_fields)


# ─────────────────────────────────────────────
# Core entities
# ─────────────────────────────────────────────


class Goal(ArchivableModel):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True, default="")
    position = models.IntegerField(default=0)
    is_completed = models.BooleanField(default=False)
    due_date = models.DateField(null=True, blank=True)
    due_time = models.TimeField(null=True, blank=True)

    # Flat container: a Goal only belongs to a Mode (no parent goal)
    mode = models.ForeignKey(
        Mode,
        on_delete=models.CASCADE,  # ✅ cascade delete on Mode removal
        null=True,
        blank=True,
        related_name="goals",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="goals",
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_goals",
    )

    class Meta:
        ordering = ["position", "id"]
        indexes = [
            Index(fields=["mode", "position"]),
            Index(fields=["is_completed"]),
            Index(fields=["due_date"]),
            Index(fields=["is_archived"]),
        ]

    def __str__(self) -> str:
        return self.title

    # ─────────────────────────────────────────
    # Mode cascade: Goal → all descendants
    # ─────────────────────────────────────────
    def cascade_mode_to_descendants(self):
        """
        Propagate this Goal's mode to all descendant Projects / Milestones / Tasks.

        - Only updates mode_id on children.
        - Preserves goal/project/parent relationships.
        - Includes archived descendants via `all_objects`.
        """
        if not self.mode_id:
            return

        new_mode_id = self.mode_id

        # 1) Collect all projects under this goal (including nested subprojects)
        root_project_ids = list(
            Project.all_objects.filter(goal=self).values_list("id", flat=True)
        )

        project_ids = set(root_project_ids)
        frontier = list(root_project_ids)

        while frontier:
            child_ids = list(
                Project.all_objects.filter(parent_id__in=frontier).values_list(
                    "id", flat=True
                )
            )
            child_ids = [pid for pid in child_ids if pid not in project_ids]
            project_ids.update(child_ids)
            frontier = child_ids

        # 2) Collect milestones directly under the goal or under those projects,
        #    then chase parent-chain downwards.
        milestone_ids = set(
            Milestone.all_objects.filter(goal=self).values_list("id", flat=True)
        )

        if project_ids:
            milestone_ids.update(
                Milestone.all_objects.filter(project_id__in=project_ids).values_list(
                    "id", flat=True
                )
            )

        frontier = list(milestone_ids)
        while frontier:
            child_ids = list(
                Milestone.all_objects.filter(parent_id__in=frontier).values_list(
                    "id", flat=True
                )
            )
            child_ids = [mid for mid in child_ids if mid not in milestone_ids]
            milestone_ids.update(child_ids)
            frontier = child_ids

        # 3) Update modes on projects & milestones
        if project_ids:
            Project.all_objects.filter(id__in=project_ids).update(mode_id=new_mode_id)
        if milestone_ids:
            Milestone.all_objects.filter(id__in=milestone_ids).update(mode_id=new_mode_id)

        # 4) Update tasks:
        #    - linked directly to this goal
        #    - OR to any collected project
        #    - OR to any collected milestone
        Task.all_objects.filter(
            Q(goal=self)
            | Q(project_id__in=project_ids if project_ids else [])
            | Q(milestone_id__in=milestone_ids if milestone_ids else [])
        ).update(mode_id=new_mode_id)


class Project(ArchivableModel):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True, default="")

    # DnD-critical
    position = models.IntegerField(default=0)
    is_completed = models.BooleanField(default=False)
    due_date = models.DateField(null=True, blank=True)
    due_time = models.TimeField(null=True, blank=True)

    # Containers (mirror Milestone: goal, parent(self), mode)
    goal = models.ForeignKey(
        Goal,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="projects",
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subprojects",
    )
    mode = models.ForeignKey(
        Mode,
        on_delete=models.CASCADE,  # ✅ cascade delete on Mode removal
        null=True,
        blank=True,
        related_name="projects",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="projects",
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_projects",
    )

    class Meta:
        ordering = ["position", "id"]
        indexes = [
            Index(fields=["mode", "position"]),
            Index(fields=["goal", "position"]),
            Index(fields=["parent", "position"]),
            Index(fields=["is_archived"]),
        ]
        constraints = [
            CheckConstraint(
                name="project_at_most_one_parent_or_goal",
                check=(
                    # none
                    (Q(parent__isnull=True) & Q(goal__isnull=True))
                    |
                    # parent only
                    (Q(parent__isnull=False) & Q(goal__isnull=True))
                    |
                    # goal only
                    (Q(parent__isnull=True) & Q(goal__isnull=False))
                ),
            ),
        ]

    def __str__(self):
        return self.title

    # ─────────────────────────────────────────
    # Mode cascade: Project → subprojects / milestones / tasks
    # ─────────────────────────────────────────
    def cascade_mode_to_descendants(self):
        """
        Propagate this Project's mode to:
        - all descendant subprojects
        - all milestones attached to those projects (plus their submilestones)
        - all tasks attached to those projects/milestones

        Only mode_id changes; ancestry (goal/parent) is preserved.
        """
        if not self.mode_id:
            return

        new_mode_id = self.mode_id

        # 1) Collect all projects in this subtree (self + subprojects)
        project_ids = {self.id}
        frontier = [self.id]

        while frontier:
            child_ids = list(
                Project.all_objects.filter(parent_id__in=frontier).values_list(
                    "id", flat=True
                )
            )
            child_ids = [pid for pid in child_ids if pid not in project_ids]
            project_ids.update(child_ids)
            frontier = child_ids

        # 2) Milestones attached to any of these projects, plus their submilestones
        milestone_ids = set(
            Milestone.all_objects.filter(project_id__in=project_ids).values_list(
                "id", flat=True
            )
        )
        frontier = list(milestone_ids)
        while frontier:
            child_ids = list(
                Milestone.all_objects.filter(parent_id__in=frontier).values_list(
                    "id", flat=True
                )
            )
            child_ids = [mid for mid in child_ids if mid not in milestone_ids]
            milestone_ids.update(child_ids)
            frontier = child_ids

        # 3) Update projects + milestones
        Project.all_objects.filter(id__in=project_ids).update(mode_id=new_mode_id)
        if milestone_ids:
            Milestone.all_objects.filter(id__in=milestone_ids).update(mode_id=new_mode_id)

        # 4) Tasks linked to these projects or milestones
        Task.all_objects.filter(
            Q(project_id__in=project_ids)
            | Q(milestone_id__in=milestone_ids if milestone_ids else [])
        ).update(mode_id=new_mode_id)


class Milestone(ArchivableModel):
    title = models.CharField(max_length=255)
    is_completed = models.BooleanField(default=False)
    due_date = models.DateField(null=True, blank=True)
    due_time = models.TimeField(null=True, blank=True)
    position = models.IntegerField(default=0)

    goal = models.ForeignKey(
        Goal,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="milestones",
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="milestones",
    )
    mode = models.ForeignKey(
        Mode,
        on_delete=models.CASCADE,  # ✅ cascade delete on Mode removal
        null=True,
        blank=True,
        related_name="milestones",
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="submilestones",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="milestones",
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_milestones",
    )

    class Meta:
        constraints = [
            CheckConstraint(
                name="milestone_at_most_one_parent_or_project_or_goal",
                check=(
                    # none
                    (Q(parent__isnull=True) & Q(project__isnull=True) & Q(goal__isnull=True))
                    |
                    # parent only
                    (Q(parent__isnull=False) & Q(project__isnull=True) & Q(goal__isnull=True))
                    |
                    # project only
                    (Q(parent__isnull=True) & Q(project__isnull=False) & Q(goal__isnull=True))
                    |
                    # goal only
                    (Q(parent__isnull=True) & Q(project__isnull=True) & Q(goal__isnull=False))
                ),
            ),
        ]
        indexes = [
            Index(fields=["is_archived"]),
        ]

    def __str__(self):
        return self.title

    # ─────────────────────────────────────────
    # Mode cascade: Milestone → submilestones / tasks
    # ─────────────────────────────────────────
    def cascade_mode_to_descendants(self):
        """
        Propagate this Milestone's mode to:
        - all descendant submilestones
        - all tasks attached to those milestones

        Only mode_id is changed; ancestry is untouched.
        """
        if not self.mode_id:
            return

        new_mode_id = self.mode_id

        # 1) Collect this milestone + all submilestones
        milestone_ids = {self.id}
        frontier = [self.id]

        while frontier:
            child_ids = list(
                Milestone.all_objects.filter(parent_id__in=frontier).values_list(
                    "id", flat=True
                )
            )
            child_ids = [mid for mid in child_ids if mid not in milestone_ids]
            milestone_ids.update(child_ids)
            frontier = child_ids

        # 2) Update milestone subtree
        Milestone.all_objects.filter(id__in=milestone_ids).update(mode_id=new_mode_id)

        # 3) Tasks linked to those milestones
        Task.all_objects.filter(milestone_id__in=milestone_ids).update(mode_id=new_mode_id)


class Task(ArchivableModel):
    title = models.CharField(max_length=255)
    is_completed = models.BooleanField(default=False)
    due_date = models.DateField(null=True, blank=True)
    due_time = models.TimeField(null=True, blank=True)
    position = models.IntegerField(default=0)

    goal = models.ForeignKey(
        Goal,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tasks",
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tasks",
    )
    milestone = models.ForeignKey(
        Milestone,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tasks",
    )
    mode = models.ForeignKey(
        Mode,
        on_delete=models.CASCADE,  # ✅ cascade delete on Mode removal
        null=True,
        blank=True,
        related_name="tasks",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tasks",
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_tasks",
    )

    class Meta:
        constraints = [
            CheckConstraint(
                name="task_at_most_one_milestone_or_project_or_goal",
                check=(
                    # none
                    (Q(milestone__isnull=True) & Q(project__isnull=True) & Q(goal__isnull=True))
                    |
                    # milestone only
                    (Q(milestone__isnull=False) & Q(project__isnull=True) & Q(goal__isnull=True))
                    |
                    # project only
                    (Q(milestone__isnull=True) & Q(project__isnull=False) & Q(goal__isnull=True))
                    |
                    # goal only
                    (Q(milestone__isnull=True) & Q(project__isnull=True) & Q(goal__isnull=False))
                ),
            ),
        ]
        indexes = [
            Index(fields=["is_archived"]),
        ]

    def __str__(self):
        return self.title
