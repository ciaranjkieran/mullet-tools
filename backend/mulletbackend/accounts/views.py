from django.shortcuts import render

# Create your views here.
# accounts/views.py
from django.middleware.csrf import get_token
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from django.contrib.auth import authenticate, login
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
import uuid
from rest_framework.permissions import IsAuthenticated
from core.services.create_default_modes_for_user import create_default_modes_for_user
from django.db import transaction

from .serializers import UserSerializer


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CSRFTokenView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        csrf_token = get_token(request)
        return Response({"csrftoken": csrf_token})
    
# accounts/views.py
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .serializers import UserSerializer

from django.contrib.auth import login, logout

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        # If a different user is already logged in in this browser, drop it
        if request.user.is_authenticated:
            logout(request)

        data = request.data
        email = (data.get("email") or "").strip().lower()
        password = data.get("password")

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

        # ✅ atomic: user + default modes are created together
        with transaction.atomic():
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
            )

            # ✅ auto-create the 5 default modes
            create_default_modes_for_user(user)

            # 🔑 new session + logged in as this new user
            request.session.flush()
            login(request, user)

        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)




class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        email = (data.get("email") or "").strip().lower()
        password = data.get("password")

        if not email or not password:
            return Response({"detail": "email and password are required."}, status=400)

        # Find username for this email (Django auth uses username by default)
        user_obj = User.objects.filter(email__iexact=email).first()
        if not user_obj:
            return Response({"detail": "Invalid credentials."}, status=400)

        user = authenticate(request, username=user_obj.username, password=password)
        if not user:
            return Response({"detail": "Invalid credentials."}, status=400)

        login(request, user)
        return Response(UserSerializer(user).data)
    
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)

# accounts/views.py
from rest_framework.permissions import IsAuthenticated

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)
