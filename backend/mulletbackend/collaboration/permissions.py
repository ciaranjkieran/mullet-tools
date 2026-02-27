from django.db.models import Q
from core.models import Mode


def accessible_mode_ids(user):
    """
    Return a lazy queryset of Mode PKs the user can READ.
    Includes modes they own and modes they collaborate on (any role).
    """
    return Mode.objects.filter(
        Q(user=user) | Q(collaborators__user=user)
    ).values_list("id", flat=True)


def writable_mode_ids(user):
    """
    Return a lazy queryset of Mode PKs the user can WRITE to.
    Includes modes they own and modes they are an *editor* on.
    """
    return Mode.objects.filter(
        Q(user=user) | Q(collaborators__user=user, collaborators__role="editor")
    ).values_list("id", flat=True)


def validate_mode_write_access(user, mode):
    """
    Raise PermissionDenied if the user cannot write to the given mode.
    No-op when mode is None.
    """
    if mode is None:
        return
    if mode.user_id == user.id:
        return
    from collaboration.models import ModeCollaborator
    if not ModeCollaborator.objects.filter(user=user, mode=mode, role="editor").exists():
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied("You don't have write access to this mode.")
