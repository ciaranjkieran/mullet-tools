from rest_framework import serializers
from .models import Subscription


class SubscriptionSerializer(serializers.ModelSerializer):
    isActive = serializers.BooleanField(source="is_active", read_only=True)
    trialDaysRemaining = serializers.IntegerField(source="trial_days_remaining", read_only=True)
    trialEnd = serializers.DateTimeField(source="trial_end", read_only=True)
    currentPeriodEnd = serializers.DateTimeField(source="current_period_end", read_only=True)
    cancelAtPeriodEnd = serializers.BooleanField(source="cancel_at_period_end", read_only=True)

    class Meta:
        model = Subscription
        fields = [
            "status",
            "isActive",
            "trialDaysRemaining",
            "trialEnd",
            "currentPeriodEnd",
            "cancelAtPeriodEnd",
        ]
