from django.contrib import admin
from .models import Template

@admin.register(Template)
class TemplateAdmin(admin.ModelAdmin):
    list_display = ("title", "type", "mode", "created_at")
    list_filter = ("type", "mode")
    search_fields = ("title",)
