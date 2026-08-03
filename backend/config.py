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