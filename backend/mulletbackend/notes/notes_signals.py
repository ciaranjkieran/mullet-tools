from django.db.models.signals import post_save
from django.dispatch import receiver

def _title_of(instance):
    for attr in ("title", "name", "label"):
        v = getattr(instance, attr, None)
        if v:
            return v
    return None

def _sync_entity_title(instance):
    # Lazy imports so nothing runs before apps are ready
    from django.contrib.contenttypes.models import ContentType
    from .models import Note

    ct = ContentType.objects.get_for_model(instance, for_concrete_model=False)
    title = _title_of(instance)
    if title:
        Note.objects.filter(content_type=ct, object_id=instance.id).update(entity_title=title)

def register_signal_handlers():
    # Lazy import the concrete models only when ready() calls us
    from core.models import Mode, Goal, Project, Milestone, Task

    @receiver(post_save, sender=Mode)
    def _sync_mode(sender, instance, **kwargs):
        _sync_entity_title(instance)

    @receiver(post_save, sender=Goal)
    def _sync_goal(sender, instance, **kwargs):
        _sync_entity_title(instance)

    @receiver(post_save, sender=Project)
    def _sync_project(sender, instance, **kwargs):
        _sync_entity_title(instance)

    @receiver(post_save, sender=Milestone)
    def _sync_milestone(sender, instance, **kwargs):
        _sync_entity_title(instance)

    @receiver(post_save, sender=Task)
    def _sync_task(sender, instance, **kwargs):
        _sync_entity_title(instance)
