# backend/config.py
# ============================================================
# Central configuration file for VoteSecure
# Loads all settings from the .env file
# Import 'settings' in any other file that needs configuration
# ============================================================

from dotenv import load_dotenv
import os

# Load the .env file into the environment
# This must happen before any os.getenv() calls
load_dotenv()


class Settings:
    # ── App ───────────────────────────────────────────────
    APP_NAME: str        = os.getenv("APP_NAME", "VoteSecure")
    ENVIRONMENT: str     = os.getenv("ENVIRONMENT", "development")

    # ── Database ──────────────────────────────────────────
    DB_HOST: str         = os.getenv("DB_HOST", "localhost")
    DB_PORT: str         = os.getenv("DB_PORT", "5432")
    DB_NAME: str         = os.getenv("DB_NAME", "votesecure_db")
    DB_USER: str         = os.getenv("DB_USER", "postgres")
    DB_PASSWORD: str     = os.getenv("DB_PASSWORD", "")

    # ── JWT Tokens ────────────────────────────────────────
    JWT_SECRET_KEY: str  = os.getenv("JWT_SECRET_KEY", "change-this")
    JWT_ALGORITHM: str   = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
    )

    # ── Redis (OTP storage) ───────────────────────────────
    REDIS_HOST: str      = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int      = int(os.getenv("REDIS_PORT", "6379"))

    # ── Email (OTP delivery) ──────────────────────────────
    SMTP_HOST: str       = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int       = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str       = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str   = os.getenv("SMTP_PASSWORD", "")

    # ── Email (Brevo / platform) ──────────────────────────
    BREVO_SMTP_HOST: str        = os.getenv("BREVO_SMTP_HOST", "smtp-relay.brevo.com")
    BREVO_SMTP_PORT: int        = int(os.getenv("BREVO_SMTP_PORT", "587"))
    BREVO_SMTP_LOGIN: str       = os.getenv("BREVO_SMTP_LOGIN", "")
    BREVO_SMTP_PASSWORD: str    = os.getenv("BREVO_SMTP_PASSWORD", "")
    EMAIL_FROM_ADDRESS: str     = os.getenv("EMAIL_FROM_ADDRESS", "votesecure.online@gmail.com")
    EMAIL_FROM_NAME: str        = os.getenv("EMAIL_FROM_NAME", "VoteSecure")
    PLATFORM_URL: str           = os.getenv("PLATFORM_URL", "http://localhost:3000")
    PLATFORM_NAME: str          = os.getenv("PLATFORM_NAME", "VoteSecure")
    SUPPORT_EMAIL: str          = os.getenv("SUPPORT_EMAIL", "votesecure.online@gmail.com")
    PAYMENT_RECEIPT_EMAIL: str  = os.getenv("PAYMENT_RECEIPT_EMAIL", "votesecure.online@gmail.com")
    GMAIL_USER: str             = os.getenv("GMAIL_USER", "")
    GMAIL_APP_PASSWORD: str     = os.getenv("GMAIL_APP_PASSWORD", "")

    # ── Organization / super-admin ─────────────────────────
    MIN_ORG_ADMINS: int             = int(os.getenv("MIN_ORG_ADMINS", "3"))
    SUPER_ADMIN_JWT_SECRET: str     = os.getenv("SUPER_ADMIN_JWT_SECRET", "change-this")

    # ── Security ──────────────────────────────────────────
    # Max failed login attempts before account is temporarily locked
    MAX_LOGIN_ATTEMPTS: int = 5
    # Lock duration in minutes
    LOCKOUT_MINUTES: int    = 15


# Single instance used across the entire app
# Usage in any file:
#   from config import settings
#   print(settings.DB_NAME)
settings = Settings()