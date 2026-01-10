# accounts/urls.py
from django.urls import path
from .views import CSRFTokenView

# accounts/urls.py
from .views import RegisterView, LoginView, LogoutView
from .views import MeView


urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("csrf/", CSRFTokenView.as_view(), name="csrf_token"),
    path("me/", MeView.as_view(), name="me"),
    path("logout/", LogoutView.as_view(), name="logout"),
]

