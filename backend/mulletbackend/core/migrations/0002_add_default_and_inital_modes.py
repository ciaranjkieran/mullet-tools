"""
Migration to insert default modes: "All", "Work", and "Play".

- "All" mode is always ID 1, non-editable, and non-deletable on the frontend.
- "Work" and "Play" modes are user-editable.
"""

from django.db import migrations

def create_default_modes(apps, schema_editor):
    """
    Inserts predefined modes into the database if they don't already exist.
    
    Modes:
    - "All" (id=1, black, default, cannot be edited or deleted on frontend).
    - "Work" (blue, user-editable).
    - "Play" (red, user-editable).
    """
    Mode = apps.get_model("core", "Mode")  # Get the Mode model dynamically

    # Ensure "All" mode exists and has id=1
    if not Mode.objects.filter(id=1).exists():
        Mode.objects.create(id=1, title="All", color="#000000", is_default=True)

    # Ensure "Work" mode exists
    if not Mode.objects.filter(title="Work").exists():
        Mode.objects.create(title="Work", color="#3498db", is_default=False)

    # Ensure "Play" mode exists
    if not Mode.objects.filter(title="Play").exists():
        Mode.objects.create(title="Play", color="#e74c3c", is_default=False)

class Migration(migrations.Migration):
    """
    Defines the migration dependencies and operations.
    """

    dependencies = [
        ("core", "0001_initial"),  # This migration depends on the initial model creation
    ]

    operations = [
        migrations.RunPython(create_default_modes),  # Run the function to add default modes
    ]
