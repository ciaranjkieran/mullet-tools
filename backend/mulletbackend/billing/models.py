from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta


class Subscription(models.Model):
    STATUS_CHOICES = [
        ("trialing", "Trialing"),
        ("active", "Active"),
        ("cancelled", "Cancelled"),
        ("expired", "Expired"),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscription",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="trialing")

    # Trial
    trial_start = models.DateTimeField(default=timezone.now)
    trial_end = models.DateTimeField(blank=True, null=True)

    # Stripe
    stripe_customer_id = models.CharField(max_length=255, blank=True, default="")
    stripe_subscription_id = models.CharField(max_length=255, blank=True, default="")

    # Billing period
    current_period_end = models.DateTimeField(blank=True, null=True)
    cancel_at_period_end = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["stripe_customer_id"]),
            models.Index(fields=["stripe_subscription_id"]),
        ]

    def __str__(self):
        return f"Subscription({self.user.username}, {self.status})"

    def save(self, *args, **kwargs):
        if self.status == "trialing" and not self.trial_end:
            self.trial_end = self.trial_start + timedelta(days=30)
        super().save(*args, **kwargs)

    @property
    def is_active(self):
        now = timezone.now()
        if self.status == "trialing":
            return self.trial_end is not None and now < self.trial_end
        if self.status == "active":
            return True
        if self.status == "cancelled":
            return self.current_period_end is not None and now < self.current_period_end
        return False

    @property
    def trial_days_remaining(self):
        if self.status != "trialing" or not self.trial_end:
            return 0
        remaining = (self.trial_end - timezone.now()).days
        return max(0, remaining)
