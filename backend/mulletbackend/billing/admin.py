from django.contrib import admin

from .models import Subscription


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ["user", "status", "trial_end", "current_period_end", "cancel_at_period_end"]
    list_filter = ["status"]
    search_fields = ["user__email", "user__username", "stripe_customer_id"]
    readonly_fields = ["created_at", "updated_at"]
