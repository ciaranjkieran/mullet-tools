from django.middleware.csrf import get_token
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import AnonRateThrottle
from rest_framework.authtoken.models import Token
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.conf import settings as django_settings
from django.http import HttpResponse
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from rest_framework import serializers, status
import csv
import io
import json
import logging
import zipfile
import uuid
from datetime import datetime
from billing.models import Subscription
from .models import Profile
from .serializers import UserSerializer, ProfileSerializer
from django.db import transaction

logger = logging.getLogger(__name__)


class AuthRateThrottle(AnonRateThrottle):
    scope = "auth"


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CSRFTokenView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        csrf_token = get_token(request)
        return Response({"csrftoken": csrf_token})


class RegisterView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        # If a different user is already logged in in this browser, drop it
        if request.user.is_authenticated:
            logout(request)

        data = request.data
        email = (data.get("email") or "").strip().lower()
        password = data.get("password")
        client_type = data.get("client_type")

        if not email or not password:
            return Response(
                {"detail": "email and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(email__iexact=email).exists():
            return Response(
                {"detail": "Email already in use."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        username = email.split("@")[0] + "_" + uuid.uuid4().hex[:6]

        token = None
        with transaction.atomic():
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
            )

            Profile.objects.create(user=user)
            Subscription.objects.create(user=user)

            if client_type == "mobile":
                token = Token.objects.create(user=user)
            else:
                request.session.flush()
                login(request, user)

        response_data = UserSerializer(user).data
        if token:
            response_data["token"] = token.key

        return Response(response_data, status=status.HTTP_201_CREATED)




class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        data = request.data
        email = (data.get("email") or "").strip().lower()
        password = data.get("password")
        client_type = data.get("client_type")

        if not email or not password:
            return Response({"detail": "email and password are required."}, status=400)

        # Find username for this email (Django auth uses username by default)
        user_obj = User.objects.filter(email__iexact=email).first()
        if not user_obj:
            return Response({"detail": "Invalid credentials."}, status=400)

        user = authenticate(request, username=user_obj.username, password=password)
        if not user:
            return Response({"detail": "Invalid credentials."}, status=400)

        response_data = UserSerializer(user).data

        if client_type == "mobile":
            token, _ = Token.objects.get_or_create(user=user)
            response_data["token"] = token.key
        else:
            login(request, user)

        return Response(response_data)
    
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Token-authenticated user (mobile): delete server-side token
        if isinstance(request.auth, Token):
            request.auth.delete()
        else:
            # Session-authenticated user (web): destroy session
            logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        return Response(ProfileSerializer(profile, context={"request": request}).data)

    def patch(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        serializer = ProfileSerializer(
            profile, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class CompleteOnboardingView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        profile.has_completed_onboarding = True
        profile.save(update_fields=["has_completed_onboarding"])
        return Response({"status": "ok"})


class ExportDataView(APIView):
    """Download all user data as JSON or CSV (zip)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        fmt = request.query_params.get("export_format", "json")
        user = request.user

        from core.models import Mode, Goal, Project, Milestone, Task
        from timers.models import TimeEntry
        from comments.models import Comment, CommentAttachment
        from notes.models import Note
        from boards.models import Pin
        from templates.models import Template
        from django.db.models import Q

        # All modes the user owns or collaborates on
        mode_ids = list(
            Mode.objects.filter(
                Q(user=user) | Q(collaborators__user=user)
            ).distinct().values_list("id", flat=True)
        )

        modes = list(Mode.objects.filter(id__in=mode_ids).values(
            "id", "title", "color", "position",
        ))
        goals = list(Goal.objects.filter(mode_id__in=mode_ids).values(
            "id", "title", "description", "is_completed", "due_date", "due_time",
            "position", "mode_id", "is_archived", "archived_at",
        ))
        projects = list(Project.objects.filter(mode_id__in=mode_ids).values(
            "id", "title", "description", "is_completed", "due_date", "due_time",
            "position", "mode_id", "goal_id", "parent_id",
            "is_archived", "archived_at",
        ))
        milestones = list(Milestone.objects.filter(mode_id__in=mode_ids).values(
            "id", "title", "is_completed", "due_date", "due_time",
            "position", "mode_id", "goal_id", "project_id", "parent_id",
            "is_archived", "archived_at",
        ))
        tasks = list(Task.objects.filter(mode_id__in=mode_ids).values(
            "id", "title", "is_completed", "due_date", "due_time",
            "position", "mode_id", "goal_id", "project_id", "milestone_id",
            "is_archived", "archived_at",
        ))
        time_entries = list(TimeEntry.objects.filter(user=user).values(
            "id", "kind", "started_at", "ended_at", "seconds", "note",
            "mode_id", "goal_id", "project_id", "milestone_id", "task_id",
            "mode_title_snapshot", "goal_title_snapshot",
            "project_title_snapshot", "milestone_title_snapshot",
            "task_title_snapshot", "session_id", "planned_seconds",
        ))
        notes = list(Note.objects.filter(mode_id__in=mode_ids).values(
            "id", "body", "mode_id", "entity_title", "created_at",
            "content_type_id", "object_id",
        ))
        comments = list(Comment.objects.filter(
            mode_id__in=mode_ids, is_deleted=False,
        ).values(
            "id", "body", "mode_id", "created_at",
            "content_type_id", "object_id",
        ))
        comment_ids = [c["id"] for c in comments]
        attachments = list(CommentAttachment.objects.filter(
            comment_id__in=comment_ids,
        ).values(
            "id", "comment_id", "original_name", "mime", "uploaded_at",
        ))
        pins = list(Pin.objects.filter(mode_id__in=mode_ids).values(
            "id", "kind", "title", "description", "url",
            "mode_id", "entity_title", "mime_type", "file_size",
            "is_board_item", "created_at",
            "content_type_id", "object_id",
        ))
        templates = list(Template.objects.filter(
            Q(user=user) | Q(mode_id__in=mode_ids),
        ).values(
            "id", "title", "type", "mode_id", "created_at", "tags", "data",
            "is_public",
        ))

        def _serialise(obj):
            """Make values JSON-safe."""
            if isinstance(obj, (datetime,)):
                return obj.isoformat()
            if isinstance(obj, uuid.UUID):
                return str(obj)
            if hasattr(obj, "isoformat"):
                return obj.isoformat()
            return obj

        datasets = {
            "modes": modes,
            "goals": goals,
            "projects": projects,
            "milestones": milestones,
            "tasks": tasks,
            "time_entries": time_entries,
            "notes": notes,
            "comments": comments,
            "comment_attachments": attachments,
            "pins": pins,
            "templates": templates,
        }

        if fmt == "csv":
            buf = io.BytesIO()
            with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
                for name, rows in datasets.items():
                    if not rows:
                        continue
                    csv_buf = io.StringIO()
                    writer = csv.DictWriter(csv_buf, fieldnames=rows[0].keys())
                    writer.writeheader()
                    for row in rows:
                        writer.writerow({
                            k: _serialise(v) for k, v in row.items()
                        })
                    zf.writestr(f"{name}.csv", csv_buf.getvalue())
            buf.seek(0)
            resp = HttpResponse(buf.read(), content_type="application/zip")
            resp["Content-Disposition"] = 'attachment; filename="mullet-export.zip"'
            return resp

        # Default: JSON
        payload = {
            "exported_at": datetime.utcnow().isoformat() + "Z",
            "user": user.email,
            **datasets,
        }
        content = json.dumps(payload, default=_serialise, indent=2)
        resp = HttpResponse(content, content_type="application/json")
        resp["Content-Disposition"] = 'attachment; filename="mullet-export.json"'
        return resp


class ForgotPasswordView(APIView):
    """POST /api/auth/forgot-password/ — send a password reset email."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        # Always return 200 to avoid email enumeration
        success_msg = {
            "detail": "If an account with that email exists, a reset link has been sent."
        }

        if not email:
            return Response(success_msg)

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response(success_msg)

        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        reset_url = (
            f"{django_settings.MULLET_FRONTEND_URL}"
            f"/reset-password?uid={uid}&token={token}"
        )

        try:
            send_mail(
                subject="Reset your Mullet password",
                message=(
                    f"Hi,\n\n"
                    f"We received a request to reset your password. "
                    f"Click the link below to set a new one:\n\n"
                    f"{reset_url}\n\n"
                    f"This link expires in 1 hour. If you didn't request "
                    f"this, you can safely ignore this email.\n\n"
                    f"— Mullet"
                ),
                from_email=django_settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
        except Exception:
            logger.exception("Failed to send password reset email to %s", email)

        return Response(success_msg)


class ResetPasswordView(APIView):
    """POST /api/auth/reset-password/ — reset password with uid + token."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        uid = request.data.get("uid", "")
        token = request.data.get("token", "")
        new_password = request.data.get("password", "")

        if not uid or not token or not new_password:
            return Response(
                {"detail": "uid, token, and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {"detail": "Invalid or expired reset link."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(user, token):
            return Response(
                {"detail": "Invalid or expired reset link."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save()

        # Invalidate all existing tokens so old sessions are logged out
        Token.objects.filter(user=user).delete()

        return Response({"detail": "Password has been reset successfully."})


class DeleteAccountView(APIView):
    """POST /api/auth/delete-account/ — permanently delete user account."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        password = request.data.get("password", "")

        if not password:
            return Response(
                {"detail": "Password is required to confirm account deletion."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not request.user.check_password(password):
            return Response(
                {"detail": "Incorrect password."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user

        # Cancel Stripe subscription if active
        try:
            sub = user.subscription
            if sub.stripe_subscription_id:
                import stripe
                stripe.api_key = django_settings.STRIPE_SECRET_KEY
                try:
                    stripe.Subscription.cancel(sub.stripe_subscription_id)
                except Exception:
                    logger.exception(
                        "Failed to cancel Stripe subscription for user %s", user.id
                    )
        except Subscription.DoesNotExist:
            pass

        # Delete user — cascades to Profile, Subscription, and all related data
        user.delete()

        return Response(
            {"detail": "Your account has been permanently deleted."},
            status=status.HTTP_200_OK,
        )
