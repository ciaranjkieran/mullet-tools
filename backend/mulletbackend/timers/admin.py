
# timers/admin.py
from django.contrib import admin
from .models import ActiveTimer, TimeEntry

admin.site.register(ActiveTimer)
admin.site.register(TimeEntry)
