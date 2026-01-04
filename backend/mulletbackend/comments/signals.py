# comments/signals.py
from django.db.models.signals import post_delete
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

@receiver(post_delete, sender=Task)
@receiver(post_delete, sender=Goal)
@receiver(post_delete, sender=Project)
@receiver(post_delete, sender=Milestone)
def cascade_delete_comments(sender, instance, **kwargs):
    delete_comments_for_instance(instance)
