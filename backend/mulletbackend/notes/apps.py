from django.apps import AppConfig

class NotesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "notes"

    def ready(self):
        # Import only inside ready(), after apps are loaded
        from .notes_signals import register_signal_handlers
        register_signal_handlers()
