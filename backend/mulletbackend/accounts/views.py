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
from rest_framework import serializers, status
import uuid
from core.services.create_default_modes_for_user import create_default_modes_for_user
from billing.models import Subscription
from .models import Profile
from .serializers import UserSerializer, ProfileSerializer
from django.db import transaction


class AuthRateThrottle(AnonRateThrottle):
    scope = "auth"


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CSRFTokenView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        csrf_token = get_token(request)
        return Response({"csrftoken": csrf_token})


class RegisterView(APIView):
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

            create_default_modes_for_user(user)
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
