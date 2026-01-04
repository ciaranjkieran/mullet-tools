# comments/services.py
from django.contrib.contenttypes.models import ContentType
from .models import Comment

def soft_delete_comments_for_instance(*, user, instance):
    """
    Soft-delete comments by user that reference instance via GenericFK.
    """
    ct = ContentType.objects.get_for_model(instance.__class__)
    Comment.objects.filter(
        user=user,
        content_type=ct,
        object_id=instance.id,
        is_deleted=False,
    ).update(is_deleted=True)
