from django.http import JsonResponse


EXEMPT_PREFIXES = (
    "/api/auth/",
    "/api/billing/",
    "/admin/",
)


class SubscriptionMiddleware:
    """
    Blocks API requests from users with expired/missing subscriptions.
    Returns 403 with code='subscription_expired' so the frontend can
    distinguish it from a regular permission denied.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path

        if not path.startswith("/api/"):
            return self.get_response(request)

        if any(path.startswith(prefix) for prefix in EXEMPT_PREFIXES):
            return self.get_response(request)

        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return self.get_response(request)

        if user.is_staff:
            return self.get_response(request)

        try:
            subscription = user.subscription
            if subscription.is_active:
                return self.get_response(request)
        except Exception:
            pass

        return JsonResponse(
            {
                "detail": "Your subscription has expired. Please subscribe to continue.",
                "code": "subscription_expired",
            },
            status=403,
        )
