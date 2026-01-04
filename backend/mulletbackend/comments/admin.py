from django.contrib import admin

from .models import Comment, CommentAttachment

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ['mode', 'content_type', 'object_id', 'created_at']
    list_filter = ['mode', 'content_type']
    search_fields = ['body']

@admin.register(CommentAttachment)
class CommentAttachmentAdmin(admin.ModelAdmin):
    list_display = ['comment', 'file', 'uploaded_at']