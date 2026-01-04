from django.contrib import admin
from .models import Mode, Task, Milestone, Project, Goal


@admin.register(Mode)
class ModeAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'color', 'position')
    search_fields = ('title',)
    ordering = ('position',)


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'title', 'is_completed', 'mode', 'goal', 'project', 'milestone', 'due_date', 'due_time', 'position'
    )
    list_filter = ('is_completed', 'mode', 'goal', 'project')
    search_fields = ('title',)
    ordering = ('mode', 'position')


@admin.register(Milestone)
class MilestoneAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'title', 'is_completed', 'mode', 'goal', 'project', 'parent', 'due_date', 'due_time', 'position'
    )
    list_filter = ('is_completed', 'mode', 'goal', 'project')
    search_fields = ('title',)
    ordering = ('mode', 'position')


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'title', 'is_completed', 'mode', 'goal', 'parent', 'due_date', 'due_time', 'position'
    )
    list_filter = ('is_completed', 'mode', 'goal')
    search_fields = ('title',)
    ordering = ('goal', 'position')


@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'title', 'is_completed', 'mode', 'due_date', 'due_time', 'position'
    )
    list_filter = ('is_completed', 'mode')
    search_fields = ('title',)
    ordering = ('position',)
