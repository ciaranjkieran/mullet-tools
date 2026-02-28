import logging
from datetime import datetime

import stripe
from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Subscription
from .serializers import SubscriptionSerializer

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY


class SubscriptionView(APIView):
    """GET /api/billing/subscription/ — current user's subscription status."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            subscription = request.user.subscription
        except Subscription.DoesNotExist:
            return Response(
                {"detail": "No subscription found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(SubscriptionSerializer(subscription).data)


class CreateCheckoutSessionView(APIView):
    """POST /api/billing/create-checkout-session/ — create Stripe Checkout session."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        try:
            subscription = user.subscription
        except Subscription.DoesNotExist:
            return Response(
                {"detail": "No subscription record found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not subscription.stripe_customer_id:
            customer = stripe.Customer.create(
                email=user.email,
                metadata={"mullet_user_id": str(user.id)},
            )
            subscription.stripe_customer_id = customer.id
            subscription.save(update_fields=["stripe_customer_id"])

        checkout_session = stripe.checkout.Session.create(
            customer=subscription.stripe_customer_id,
            payment_method_types=["card"],
            mode="subscription",
            line_items=[
                {
                    "price": settings.STRIPE_PRICE_ID,
                    "quantity": 1,
                },
            ],
            success_url=settings.MULLET_FRONTEND_URL + "/dashboard?checkout=success",
            cancel_url=settings.MULLET_FRONTEND_URL + "/pricing?checkout=cancelled",
            metadata={"mullet_user_id": str(user.id)},
        )

        return Response({"checkoutUrl": checkout_session.url})


class CancelSubscriptionView(APIView):
    """POST /api/billing/cancel/ — cancel subscription at period end."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            subscription = request.user.subscription
        except Subscription.DoesNotExist:
            return Response(
                {"detail": "No subscription found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not subscription.stripe_subscription_id:
            return Response(
                {"detail": "No active Stripe subscription to cancel."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        stripe.Subscription.modify(
            subscription.stripe_subscription_id,
            cancel_at_period_end=True,
        )

        subscription.cancel_at_period_end = True
        subscription.status = "cancelled"
        subscription.save(update_fields=["cancel_at_period_end", "status"])

        return Response(SubscriptionSerializer(subscription).data)


class ResumeSubscriptionView(APIView):
    """POST /api/billing/resume/ — undo cancel-at-period-end."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            subscription = request.user.subscription
        except Subscription.DoesNotExist:
            return Response(
                {"detail": "No subscription found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not subscription.stripe_subscription_id:
            return Response(
                {"detail": "No Stripe subscription to resume."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        stripe.Subscription.modify(
            subscription.stripe_subscription_id,
            cancel_at_period_end=False,
        )

        subscription.cancel_at_period_end = False
        subscription.status = "active"
        subscription.save(update_fields=["cancel_at_period_end", "status"])

        return Response(SubscriptionSerializer(subscription).data)


@method_decorator(csrf_exempt, name="dispatch")
class StripeWebhookView(APIView):
    """POST /api/billing/webhook/ — Stripe webhook endpoint."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        payload = request.body
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            logger.warning("Stripe webhook: invalid payload")
            return HttpResponse(status=400)
        except stripe.error.SignatureVerificationError:
            logger.warning("Stripe webhook: invalid signature")
            return HttpResponse(status=400)

        event_type = event["type"]
        data_object = event["data"]["object"]

        logger.info("Stripe webhook received: %s", event_type)

        if event_type == "checkout.session.completed":
            self._handle_checkout_completed(data_object)
        elif event_type == "invoice.paid":
            self._handle_invoice_paid(data_object)
        elif event_type == "customer.subscription.deleted":
            self._handle_subscription_deleted(data_object)
        elif event_type == "customer.subscription.updated":
            self._handle_subscription_updated(data_object)

        return HttpResponse(status=200)

    def _handle_checkout_completed(self, session):
        customer_id = session.get("customer")
        subscription_id = session.get("subscription")

        if not customer_id:
            logger.warning("checkout.session.completed: no customer_id")
            return

        try:
            sub = Subscription.objects.get(stripe_customer_id=customer_id)
        except Subscription.DoesNotExist:
            user_id = session.get("metadata", {}).get("mullet_user_id")
            if not user_id:
                logger.warning("checkout.session.completed: cannot find subscription")
                return
            try:
                sub = Subscription.objects.get(user_id=int(user_id))
                sub.stripe_customer_id = customer_id
            except Subscription.DoesNotExist:
                logger.warning("checkout.session.completed: no sub for user %s", user_id)
                return

        sub.stripe_subscription_id = subscription_id or ""
        sub.status = "active"
        sub.cancel_at_period_end = False
        sub.save(
            update_fields=[
                "stripe_customer_id",
                "stripe_subscription_id",
                "status",
                "cancel_at_period_end",
            ]
        )
        logger.info("Activated subscription for user %s", sub.user_id)

    def _handle_invoice_paid(self, invoice):
        subscription_id = invoice.get("subscription")
        if not subscription_id:
            return

        try:
            sub = Subscription.objects.get(stripe_subscription_id=subscription_id)
        except Subscription.DoesNotExist:
            logger.warning("invoice.paid: no sub for stripe_subscription_id=%s", subscription_id)
            return

        period_end = (
            invoice.get("lines", {}).get("data", [{}])[0].get("period", {}).get("end")
        )
        if period_end:
            sub.current_period_end = datetime.fromtimestamp(period_end, tz=timezone.utc)

        sub.status = "active"
        sub.save(update_fields=["status", "current_period_end"])
        logger.info("invoice.paid: updated subscription for user %s", sub.user_id)

    def _handle_subscription_deleted(self, stripe_sub):
        subscription_id = stripe_sub.get("id")
        if not subscription_id:
            return

        try:
            sub = Subscription.objects.get(stripe_subscription_id=subscription_id)
        except Subscription.DoesNotExist:
            logger.warning("subscription.deleted: no sub for %s", subscription_id)
            return

        sub.status = "expired"
        sub.cancel_at_period_end = False
        sub.save(update_fields=["status", "cancel_at_period_end"])
        logger.info("Expired subscription for user %s", sub.user_id)

    def _handle_subscription_updated(self, stripe_sub):
        subscription_id = stripe_sub.get("id")
        if not subscription_id:
            return

        try:
            sub = Subscription.objects.get(stripe_subscription_id=subscription_id)
        except Subscription.DoesNotExist:
            return

        cancel_at = stripe_sub.get("cancel_at_period_end", False)
        period_end = stripe_sub.get("current_period_end")
        stripe_status = stripe_sub.get("status")

        sub.cancel_at_period_end = cancel_at

        if period_end:
            sub.current_period_end = datetime.fromtimestamp(period_end, tz=timezone.utc)

        if stripe_status == "active" and not cancel_at:
            sub.status = "active"
        elif stripe_status == "active" and cancel_at:
            sub.status = "cancelled"
        elif stripe_status in ("canceled", "unpaid"):
            sub.status = "expired"

        sub.save(update_fields=["cancel_at_period_end", "current_period_end", "status"])
