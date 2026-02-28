from django.urls import path

from .views import (
    CancelSubscriptionView,
    CreateCheckoutSessionView,
    ResumeSubscriptionView,
    StripeWebhookView,
    SubscriptionView,
)

urlpatterns = [
    path("subscription/", SubscriptionView.as_view(), name="subscription"),
    path("create-checkout-session/", CreateCheckoutSessionView.as_view(), name="create-checkout-session"),
    path("cancel/", CancelSubscriptionView.as_view(), name="cancel-subscription"),
    path("resume/", ResumeSubscriptionView.as_view(), name="resume-subscription"),
    path("webhook/", StripeWebhookView.as_view(), name="stripe-webhook"),
]
