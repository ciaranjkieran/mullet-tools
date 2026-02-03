"""
Django settings for mulletbackend project.
"""

from pathlib import Path
import os
import dj_database_url

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

SECRET_KEY = os.environ.get(
    "SECRET_KEY",
    "django-insecure-dev-only-change-me",
)

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
    ALLOWED_HOSTS += ["192.168.0.7"]




# ------------------------------------------------------------------------------
# Applications
# ------------------------------------------------------------------------------

INSTALLED_APPS = [
    "accounts",
    "batch",
    "timers",
    "core",
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

# Allow any Vercel preview deployment URL
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://.*\.vercel\.app$",
]

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://mullet-tools-web-hqeg.vercel.app",
    # Keep these for later; harmless if unused:
    "https://www.mullet.tools",
]

if not IS_PROD:
    CORS_ALLOWED_ORIGINS += ["http://192.168.0.7:3000"]
    CSRF_TRUSTED_ORIGINS += ["http://192.168.0.7:3000"]
    
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
# REST Framework
# ------------------------------------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
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
