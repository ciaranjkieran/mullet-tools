# accounts/urls.py
from django.urls import path
from .views import CSRFTokenView

# accounts/urls.py
from .views import RegisterView, LoginView, LogoutView
from .views import MeView


urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/csrf/', CSRFTokenView.as_view(), name='csrf_token'),
        path('auth/me/', MeView.as_view(), name='me'),
            path("auth/logout/", LogoutView.as_view(), name="logout"),


]
