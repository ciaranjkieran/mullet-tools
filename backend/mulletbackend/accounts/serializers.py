# accounts/serializers.py
from django.contrib.auth.models import User
from rest_framework import serializers

from billing.serializers import SubscriptionSerializer
from .models import Profile


class ProfileSerializer(serializers.ModelSerializer):
    displayName = serializers.CharField(
        source="display_name", required=False, allow_blank=True
    )
    avatar = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Profile
        fields = ["displayName", "avatar"]


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)
    subscription = SubscriptionSerializer(read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "profile", "subscription"]
