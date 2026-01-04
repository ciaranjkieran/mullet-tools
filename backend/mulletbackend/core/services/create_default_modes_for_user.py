# core/services.py
from core.models import Mode

DEFAULT_MODES = [
    {"title": "Work", "color": "#3B82F6"},
    {"title": "Personal", "color": "#8B5CF6"},
    {"title": "Home", "color": "#64748B"},
    {"title": "Side Project", "color": "#10B981"},
    {"title": "Hobby", "color": "#F59E0B"},
]

def create_default_modes_for_user(user):
    # idempotent-ish: avoid duplicates if something re-calls this
    existing = set(
        Mode.objects.filter(user=user).values_list("title", flat=True)
    )
    to_create = []
    for i, m in enumerate(DEFAULT_MODES):
        if m["title"] in existing:
            continue
        to_create.append(
            Mode(
                user=user,
                title=m["title"],
                color=m["color"],
                position=i,
            )
        )
    if to_create:
        Mode.objects.bulk_create(to_create)
