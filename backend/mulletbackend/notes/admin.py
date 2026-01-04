from django.contrib import admin
from .models import Note

@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ("id", "mode", "content_type", "object_id", "entity_title", "created_at")
    search_fields = ("body", "entity_title")
