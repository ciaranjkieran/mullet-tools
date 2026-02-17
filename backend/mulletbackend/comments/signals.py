# comments/signals.py
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
from django.contrib.contenttypes.models import ContentType

from comments.models import Comment
from core.models import Task
from core.models import Goal
from core.models import Project
from core.models import Milestone

def delete_comments_for_instance(instance):
    content_type = ContentType.objects.get_for_model(instance.__class__)
    Comment.objects.filter(content_type=content_type, object_id=instance.id).delete()

def _sync_comment_mode(instance):
    """Keep comments' mode in sync with their parent entity's mode."""
    mode_id = getattr(instance, "mode_id", None)
    if mode_id is None:
        return
    ct = ContentType.objects.get_for_model(instance, for_concrete_model=False)
    Comment.objects.filter(
        content_type=ct, object_id=instance.id,
    ).exclude(mode_id=mode_id).update(mode_id=mode_id)

@receiver(post_delete, sender=Task)
@receiver(post_delete, sender=Goal)
@receiver(post_delete, sender=Project)
@receiver(post_delete, sender=Milestone)
def cascade_delete_comments(sender, instance, **kwargs):
    delete_comments_for_instance(instance)

@receiver(post_save, sender=Task)
@receiver(post_save, sender=Goal)
@receiver(post_save, sender=Project)
@receiver(post_save, sender=Milestone)
def sync_comment_mode_on_save(sender, instance, **kwargs):
    _sync_comment_mode(instance)
