# accounts/urls.py
from django.urls import path
from .views import (
    CSRFTokenView,
    RegisterView,
    LoginView,
    LogoutView,
    MeView,
    ProfileView,
    CompleteOnboardingView,
    ExportDataView,
    ForgotPasswordView,
    ResetPasswordView,
    DeleteAccountView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("csrf/", CSRFTokenView.as_view(), name="csrf_token"),
    path("me/", MeView.as_view(), name="me"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("complete-onboarding/", CompleteOnboardingView.as_view(), name="complete-onboarding"),
    path("export/", ExportDataView.as_view(), name="export-data"),
    path("forgot-password/", ForgotPasswordView.as_view(), name="forgot-password"),
    path("reset-password/", ResetPasswordView.as_view(), name="reset-password"),
    path("delete-account/", DeleteAccountView.as_view(), name="delete-account"),
]
