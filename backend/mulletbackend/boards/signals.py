# boards/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.contenttypes.models import ContentType

from boards.models import Pin
from core.models import Task, Goal, Project, Milestone


def _sync_pin_mode(instance):
    """Keep pins' mode in sync with their parent entity's mode."""
    mode_id = getattr(instance, "mode_id", None)
    if mode_id is None:
        return
    ct = ContentType.objects.get_for_model(instance, for_concrete_model=False)
    Pin.objects.filter(
        content_type=ct, object_id=instance.id,
    ).exclude(mode_id=mode_id).update(mode_id=mode_id)


@receiver(post_save, sender=Task)
@receiver(post_save, sender=Goal)
@receiver(post_save, sender=Project)
@receiver(post_save, sender=Milestone)
def sync_pin_mode_on_save(sender, instance, **kwargs):
    _sync_pin_mode(instance)
