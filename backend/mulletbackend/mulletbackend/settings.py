"""
Django settings for mulletbackend project.
"""

from pathlib import Path
import os
import dj_database_url
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# ------------------------------------------------------------------------------
# Base
# ------------------------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

# ------------------------------------------------------------------------------
# Environment
# ------------------------------------------------------------------------------

# Render sets RENDER in the environment. Locally it should be unset.
IS_PROD = os.environ.get("RENDER") is not None
DEBUG = not IS_PROD

# ------------------------------------------------------------------------------
# Security
# ------------------------------------------------------------------------------

if IS_PROD:
    SECRET_KEY = os.environ["SECRET_KEY"]  # crash on startup if missing
else:
    SECRET_KEY = os.environ.get("SECRET_KEY", "django-insecure-dev-only-change-me")

ALLOWED_HOSTS = [
    "127.0.0.1",
    "localhost",
    "mullet-tools-backend.onrender.com",
    "mullet.tools",
    "www.mullet.tools",
]

# Allow Render preview / internal routing
if IS_PROD:
    ALLOWED_HOSTS.append(".onrender.com")

# Local LAN access (phone testing)
if not IS_PROD:
    ALLOWED_HOSTS += ["192.168.1.254"]




# ------------------------------------------------------------------------------
# AI (Anthropic)
# ------------------------------------------------------------------------------

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

# ------------------------------------------------------------------------------
# Stripe (Billing)
# ------------------------------------------------------------------------------

STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_PUBLISHABLE_KEY = os.environ.get("STRIPE_PUBLISHABLE_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PRICE_ID = os.environ.get("STRIPE_PRICE_ID", "")
MULLET_FRONTEND_URL = os.environ.get("MULLET_FRONTEND_URL", "http://localhost:3000")

# ------------------------------------------------------------------------------
# Applications
# ------------------------------------------------------------------------------

INSTALLED_APPS = [
    "accounts",
    "ai",
    "batch",
    "billing",
    "timers",
    "core",
    "collaboration",
    "notes.apps.NotesConfig",
    "comments",
    "boards",
    "templates",

    "rest_framework",
    "corsheaders",
    "django_extensions",

    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

# ------------------------------------------------------------------------------
# Middleware
# ------------------------------------------------------------------------------

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "billing.middleware.SubscriptionMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# ------------------------------------------------------------------------------
# URLs / WSGI
# ------------------------------------------------------------------------------

ROOT_URLCONF = "mulletbackend.urls"
WSGI_APPLICATION = "mulletbackend.wsgi.application"

# ------------------------------------------------------------------------------
# Templates
# ------------------------------------------------------------------------------

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# ------------------------------------------------------------------------------
# Database
# ------------------------------------------------------------------------------

DATABASES = {
    "default": dj_database_url.config(
        default="sqlite:///db.sqlite3",
        conn_max_age=600,
        ssl_require=IS_PROD,
    )
}

# SQLite concurrency fix: wait up to 20s for lock instead of failing immediately
if DATABASES["default"]["ENGINE"] == "django.db.backends.sqlite3":
    DATABASES["default"].setdefault("OPTIONS", {})["timeout"] = 20

# ------------------------------------------------------------------------------
# Password validation
# ------------------------------------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ------------------------------------------------------------------------------
# Internationalization
# ------------------------------------------------------------------------------

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ------------------------------------------------------------------------------
# Static / Media
# ------------------------------------------------------------------------------

STATIC_URL = "/static/"
MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "media")

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ------------------------------------------------------------------------------
# CORS / CSRF  (Vercel ↔ Render, session auth)
# ------------------------------------------------------------------------------

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://mullet-tools-web-hqeg.vercel.app",
    # Keep these for later; harmless if unused:
    "https://www.mullet.tools",
]

# Allow Vercel preview deployments scoped to the mullet project
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://mullet-tools-web.*\.vercel\.app$",
]

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://mullet-tools-web-hqeg.vercel.app",
    # Keep these for later; harmless if unused:
    "https://www.mullet.tools",
]

if not IS_PROD:
    CORS_ALLOWED_ORIGINS += ["http://192.168.1.254:3000"]
    CSRF_TRUSTED_ORIGINS += ["http://192.168.1.254:3000"]
    
if not IS_PROD:
    CSRF_COOKIE_SECURE = False
    SESSION_COOKIE_SECURE = False

    # This helps when you're doing API calls from a different origin in dev
    CSRF_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SAMESITE = "Lax"


CORS_ALLOW_CREDENTIALS = True

# ✅ Keep ONLINE behaviour the same, but make local work over HTTP.
if IS_PROD:
    # Required for cross-site cookies (Vercel -> Render) over HTTPS
    CSRF_COOKIE_SAMESITE = "None"
    CSRF_COOKIE_SECURE = True

    SESSION_COOKIE_SAMESITE = "None"
    SESSION_COOKIE_SECURE = True
else:
    # Local dev over HTTP (Secure cookies won't be set on http://)
    CSRF_COOKIE_SAMESITE = "Lax"
    CSRF_COOKIE_SECURE = False

    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = False

CSRF_COOKIE_HTTPONLY = False

# ------------------------------------------------------------------------------
# Production HTTPS security headers
# ------------------------------------------------------------------------------
if IS_PROD:
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# ------------------------------------------------------------------------------
# REST Framework
# ------------------------------------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_THROTTLE_CLASSES": (
        [
            "rest_framework.throttling.AnonRateThrottle",
            "rest_framework.throttling.UserRateThrottle",
        ]
        if IS_PROD
        else []
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": "20/minute",
        "user": "200/minute",
        "auth": "5/minute",
    },
}

# ------------------------------------------------------------------------------
# Logging
# ------------------------------------------------------------------------------

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {"class": "logging.StreamHandler"},
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django.request": {
            "handlers": ["console"],
            "level": "DEBUG" if DEBUG else "INFO",
            "propagate": False,
        },
    },
}
