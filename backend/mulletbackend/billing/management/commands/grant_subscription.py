from datetime import timedelta

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone

from billing.models import Subscription


class Command(BaseCommand):
    help = "Grant an active subscription to a user (for testing/development)."

    def add_arguments(self, parser):
        parser.add_argument("email", type=str, help="User email address")
        parser.add_argument(
            "--days",
            type=int,
            default=365,
            help="Number of days for the subscription (default: 365)",
        )
        parser.add_argument(
            "--status",
            type=str,
            default="active",
            choices=["trialing", "active"],
            help="Subscription status to set (default: active)",
        )

    def handle(self, *args, **options):
        email = options["email"]
        days = options["days"]
        status_val = options["status"]

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            self.stderr.write(self.style.ERROR(f"No user found with email: {email}"))
            return

        sub, created = Subscription.objects.get_or_create(user=user)
        sub.status = status_val
        if status_val == "active":
            sub.current_period_end = timezone.now() + timedelta(days=days)
        elif status_val == "trialing":
            sub.trial_start = timezone.now()
            sub.trial_end = timezone.now() + timedelta(days=days)
        sub.save()

        action = "Created" if created else "Updated"
        self.stdout.write(
            self.style.SUCCESS(
                f"{action} {status_val} subscription for {email} ({days} days)"
            )
        )
