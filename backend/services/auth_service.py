# backend/services/auth_service.py
# ============================================================
# Authentication business logic for VoteSecure
# Handles: password hashing, JWT creation/verification,
#          OTP generation, and login attempt tracking
# ============================================================

import bcrypt
import random
import redis
from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from config import settings


# ── Redis Connection ─────────────────────────────────────────
# Redis stores OTP codes with automatic expiry
# Much faster than PostgreSQL for short-lived temporary data
redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=0,
    decode_responses=True,  # Return strings not bytes
)


# ════════════════════════════════════════════════════════════
# PASSWORD FUNCTIONS
# ════════════════════════════════════════════════════════════

def hash_password(plain_password: str) -> str:
    """
    Hash a plain text password using bcrypt.

    bcrypt is a one-way hashing algorithm:
    - It adds a random 'salt' so two identical passwords
      produce completely different hashes
    - It is intentionally slow (cost factor 12 = 4096 rounds)
      making brute-force attacks take years

    The result looks like:
    $2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WEXYz...

    NEVER store plain_password. ALWAYS store the hash.
    """
    password_bytes = plain_password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, stored_hash: str) -> bool:
    """
    Verify a submitted password against its stored bcrypt hash.

    bcrypt extracts the salt from stored_hash, rehashes the
    submitted password with that same salt, and compares.

    Returns True if they match, False otherwise.
    Never raises an exception — always returns bool.
    """
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            stored_hash.encode("utf-8"),
        )
    except Exception:
        return False


# ════════════════════════════════════════════════════════════
# JWT TOKEN FUNCTIONS
# ════════════════════════════════════════════════════════════

def create_access_token(user_id: str, role: str) -> str:
    """
    Create a JWT (JSON Web Token) for an authenticated user.

    The token contains:
    - sub: the user's ID (subject)
    - role: their system role (voter, admin, etc.)
    - exp: expiry timestamp (30 minutes from now)
    - iat: issued-at timestamp

    The token is SIGNED with JWT_SECRET_KEY.
    If anyone tampers with the payload, the signature
    will not match and the token will be rejected.
    """
    expire = datetime.utcnow() + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub":  user_id,
        "role": role,
        "exp":  expire,
        "iat":  datetime.utcnow(),
    }
    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def verify_access_token(token: str) -> dict:
    """
    Verify a JWT token and return its payload.

    Raises HTTP 401 if:
    - Token is expired
    - Token signature is invalid (tampered)
    - Token is malformed

    Used by every protected endpoint to confirm
    the requester is authenticated.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token — no subject",
            )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid or has expired. Please log in again.",
        )


# ════════════════════════════════════════════════════════════
# OTP FUNCTIONS
# ════════════════════════════════════════════════════════════

def generate_otp(user_id: str) -> str:
    """
    Generate a 6-digit one-time password and store it in Redis.

    Redis key:  otp:{user_id}
    Redis value: the 6-digit code
    TTL (expiry): 10 minutes — auto-deleted by Redis after that

    Returns the OTP code (so we can email it to the voter).
    """
    otp_code = str(random.randint(100000, 999999))

    # SETEX = SET with EXpiry
    # Key expires automatically after 600 seconds (10 minutes)
    redis_client.setex(
        name=f"otp:{user_id}",
        time=600,
        value=otp_code,
    )
    return otp_code


def verify_otp(user_id: str, submitted_code: str) -> bool:
    """
    Check if the submitted OTP matches what is stored in Redis.

    Returns True if correct and not expired.
    Returns False if wrong, expired, or never created.

    IMPORTANT: Deletes the OTP after successful verification
    so it cannot be reused.
    """
    stored_code = redis_client.get(f"otp:{user_id}")

    if stored_code is None:
        # OTP expired or was never created
        return False

    if stored_code == submitted_code:
        # Delete immediately after successful use — one-time only
        redis_client.delete(f"otp:{user_id}")
        return True

    return False


# ════════════════════════════════════════════════════════════
# LOGIN ATTEMPT TRACKING (Brute-Force Protection)
# ════════════════════════════════════════════════════════════

def record_failed_attempt(student_number: str) -> int:
    """
    Increment the failed login counter for a student number.
    Stored in Redis with a 15-minute window.
    Returns the current attempt count.
    """
    key = f"login_attempts:{student_number}"
    attempts = redis_client.incr(key)  # Increment by 1 (creates if not exists)
    if attempts == 1:
        # First failure — set 15-minute expiry window
        redis_client.expire(key, settings.LOCKOUT_MINUTES * 60)
    return attempts


def is_account_locked(student_number: str) -> bool:
    """
    Check if a student number has exceeded the maximum
    allowed failed login attempts.
    """
    key = f"login_attempts:{student_number}"
    attempts = redis_client.get(key)
    if attempts and int(attempts) >= settings.MAX_LOGIN_ATTEMPTS:
        return True
    return False


def clear_failed_attempts(student_number: str):
    """
    Clear the failed attempt counter after successful login.
    """
    redis_client.delete(f"login_attempts:{student_number}")