# backend/routers/auth.py
# ============================================================
# Authentication endpoints for VoteSecure
# POST /api/auth/register     - Register a new voter (admin)
# POST /api/auth/login        - Step 1: password verification
# POST /api/auth/login/otp    - Step 2: OTP verification
# GET  /api/auth/me           - Get current user profile
# POST /api/auth/logout       - Logout (client clears token)
# ============================================================

from fastapi import APIRouter, HTTPException, status, Request, Depends
from database import get_connection
from config import settings
from models.voter import (
    VoterRegister, VoterLogin, OTPVerify,
    LoginStep1Response, LoginSuccessResponse, VoterResponse,
)
from services.auth_service import (
    hash_password, verify_password,
    create_access_token,
    generate_otp, verify_otp,
    record_failed_attempt, is_account_locked, clear_failed_attempts,
)
from services.email_service import send_otp_email
from dependencies import get_current_user, require_admin

router = APIRouter()


# ════════════════════════════════════════════════════════════
# REGISTER A VOTER
# Only admins can register voters
# ════════════════════════════════════════════════════════════
@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_voter(
    data: VoterRegister,
    current_user: dict = Depends(require_admin),
):
    """
    Register a new voter in the system.
    Admin-only endpoint - voters cannot self-register.

    Creates two rows:
    1. A row in users (login credentials)
    2. A row in voters (student-specific profile)
    """
    conn   = get_connection()
    cursor = conn.cursor()

    try:
        # ── Check email is not already taken ──────────────
        cursor.execute(
            "SELECT user_id FROM users WHERE email = %s",
            (data.email,)
        )
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email address already exists.",
            )

        # ── Check student number is not already taken ─────
        cursor.execute(
            "SELECT voter_id FROM voters WHERE student_number = %s",
            (data.student_number,)
        )
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This student number is already registered.",
            )

        # ── Hash the password ─────────────────────────────
        password_hash = hash_password(data.password)

        # ── Insert into users table ───────────────────────
        cursor.execute(
            """
            INSERT INTO users (full_name, email, password_hash, role)
            VALUES (%s, %s, %s, 'voter')
            RETURNING user_id, full_name, email, role, created_at
            """,
            (data.full_name, data.email, password_hash)
        )
        new_user = cursor.fetchone()
        user_id  = str(new_user["user_id"])

        # ── Insert into voters table ──────────────────────
        cursor.execute(
            """
            INSERT INTO voters
                (user_id, student_number, department, level,
                 eligibility_group, phone_number)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING voter_id
            """,
            (
                user_id,
                data.student_number,
                data.department,
                data.level,
                data.eligibility_group,
                data.phone_number,
            )
        )
        new_voter = cursor.fetchone()

        # ── Log the action ────────────────────────────────
        cursor.execute(
            """
            INSERT INTO audit_logs
                (actor_id, actor_type, event_type, event_description)
            VALUES (%s, 'admin', 'VOTER_REGISTERED', %s)
            """,
            (
                current_user["sub"],
                f"Voter registered: {data.full_name} ({data.student_number})",
            )
        )

        conn.commit()

        return {
            "message":        "Voter registered successfully.",
            "user_id":        user_id,
            "voter_id":       str(new_voter["voter_id"]),
            "student_number": data.student_number,
            "full_name":      data.full_name,
            "email":          data.email,
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")
    finally:
        cursor.close()
        conn.close()


# ════════════════════════════════════════════════════════════
# LOGIN - STEP 1: Password Verification
# ════════════════════════════════════════════════════════════
@router.post("/login", response_model=LoginStep1Response)
def login_step1(data: VoterLogin, request: Request):
    """
    Step 1 of 2-step login.
    Voter submits student number and password.
    If correct: generates OTP, emails it, returns user_id.
    """
    conn   = get_connection()
    cursor = conn.cursor()

    try:
        # Lockout tracking is a raw Redis key keyed on this string
        # (login_attempts:{value}), so it must be normalized the
        # same way at every call site - otherwise "John.Doe" and
        # "john.doe" would track separate counters.
        identifier = data.identifier.strip().lower()

        # ── Check for account lockout ─────────────────────
        if is_account_locked(identifier):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"Account temporarily locked after "
                    f"{settings.MAX_LOGIN_ATTEMPTS} failed attempts. "
                    f"Try again in {settings.LOCKOUT_MINUTES} minutes."
                ),
            )

        # ── Find voter by username, student number, or email ──
        # Case-insensitive on all three: existing student numbers
        # are stored upper-cased, usernames are stored as submitted
        # (the frontend lower-cases them), and email login should
        # never be case-sensitive.
        cursor.execute(
            """
            SELECT u.user_id, u.full_name, u.email,
                   u.password_hash, u.role, u.is_active
            FROM users u
            LEFT JOIN voters v ON u.user_id = v.user_id
            WHERE LOWER(u.username)      = LOWER(%s)
               OR LOWER(v.student_number) = LOWER(%s)
               OR LOWER(u.email)          = LOWER(%s)
            LIMIT 1
            """,
            (data.identifier, data.identifier, data.identifier)
        )
        user = cursor.fetchone()

        # ── Generic error - don't reveal which check failed
        # (Security: never tell an attacker "wrong password"
        #  vs "user not found" - both return the same message)
        if not user or not verify_password(data.password, user["password_hash"]):
            attempts = record_failed_attempt(identifier)
            remaining = settings.MAX_LOGIN_ATTEMPTS - attempts

            # Log the failed attempt
            cursor.execute(
                """
                INSERT INTO audit_logs
                    (actor_type, event_type, event_description, ip_address)
                VALUES ('voter', 'LOGIN_FAILED_PASSWORD', %s, %s)
                """,
                (
                    f"Failed login for identifier: {data.identifier}",
                    str(request.client.host),
                )
            )
            conn.commit()

            detail = "Invalid username or password."
            if remaining > 0:
                detail += f" {remaining} attempt(s) remaining."

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=detail,
            )

        # ── Check account is active ───────────────────────
        if not user["is_active"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been deactivated. Contact the administrator.",
            )

        # ── Password correct - generate and send OTP ──────
        user_id  = str(user["user_id"])
        otp_code = generate_otp(user_id)

        send_otp_email(
            recipient_email=user["email"],
            voter_name=user["full_name"],
            otp_code=otp_code,
        )

        # Log successful password step
        cursor.execute(
            """
            INSERT INTO audit_logs
                (actor_id, actor_type, event_type, event_description, ip_address)
            VALUES (%s, 'voter', 'LOGIN_PASSWORD_OK', %s, %s)
            """,
            (
                user_id,
                f"Password verified for {user['full_name']}",
                str(request.client.host),
            )
        )
        conn.commit()

        # Mask email for privacy in response
        email = user["email"]
        masked = email[:2] + "***@" + email.split("@")[1]

        return LoginStep1Response(
            status="otp_required",
            user_id=user_id,
            message=f"Verification code sent to {masked}",
        )

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Login error: {str(e)}")
    finally:
        cursor.close()
        conn.close()


# ════════════════════════════════════════════════════════════
# LOGIN - STEP 2: OTP Verification
# ════════════════════════════════════════════════════════════
@router.post("/login/otp", response_model=LoginSuccessResponse)
def login_step2(data: OTPVerify, request: Request):
    """
    Step 2 of 2-step login.
    Voter submits the 6-digit OTP code from their email.
    If correct: issues JWT access token. Login complete.
    """
    conn   = get_connection()
    cursor = conn.cursor()

    try:
        # ── Verify the OTP ────────────────────────────────
        if not verify_otp(data.user_id, data.otp_code):
            # Log the failed OTP
            cursor.execute(
                """
                INSERT INTO audit_logs
                    (actor_id, actor_type, event_type, event_description, ip_address)
                VALUES (%s, 'voter', 'LOGIN_FAILED_OTP', 'Invalid or expired OTP', %s)
                """,
                (data.user_id, str(request.client.host))
            )
            conn.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired verification code. Please try again.",
            )

        # ── OTP correct - fetch user details ──────────────
        cursor.execute(
            "SELECT user_id, full_name, email, role, username FROM users WHERE user_id = %s",
            (data.user_id,)
        )
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")

        user_id   = str(user["user_id"])
        full_name = user["full_name"]
        role      = user["role"]

        # ── Issue JWT access token ────────────────────────
        access_token = create_access_token(user_id=user_id, role=role)

        # ── Clear failed attempts on success ──────────────
        # Login can succeed via username, student number, or email
        # (see login_step1), and the lockout counter is keyed by
        # whichever one was actually typed - clear all three so a
        # voter who alternates identifiers never gets stuck with a
        # stale counter under one of them.
        clear_failed_attempts(user["email"].lower())
        if user["username"]:
            clear_failed_attempts(user["username"].lower())
        cursor.execute(
            "SELECT student_number FROM voters WHERE user_id = %s",
            (user_id,)
        )
        voter_row = cursor.fetchone()
        if voter_row:
            clear_failed_attempts(voter_row["student_number"].lower())

        # ── Update last login timestamp ───────────────────
        cursor.execute(
            "UPDATE users SET updated_at = NOW() WHERE user_id = %s",
            (user_id,)
        )

        # ── Log successful login ──────────────────────────
        cursor.execute(
            """
            INSERT INTO audit_logs
                (actor_id, actor_type, event_type, event_description, ip_address)
            VALUES (%s, 'voter', 'LOGIN_SUCCESS', %s, %s)
            """,
            (
                user_id,
                f"Successful login: {full_name}",
                str(request.client.host),
            )
        )
        conn.commit()

        return LoginSuccessResponse(
            status="authenticated",
            access_token=access_token,
            token_type="bearer",
            user_id=user_id,
            full_name=full_name,
            role=role,
        )

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"OTP verification error: {str(e)}")
    finally:
        cursor.close()
        conn.close()


# ════════════════════════════════════════════════════════════
# GET CURRENT USER PROFILE
# ════════════════════════════════════════════════════════════
@router.get("/me")
def get_my_profile(current_user: dict = Depends(get_current_user)):
    """
    Returns the profile of the currently logged-in user.
    Requires a valid JWT token in the Authorization header.
    """
    conn   = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT u.user_id, u.full_name, u.email, u.role, u.is_active,
                   v.voter_id, v.student_number, v.department,
                   v.level, v.eligibility_group
            FROM users u
            LEFT JOIN voters v ON u.user_id = v.user_id
            WHERE u.user_id = %s
            """,
            (current_user["sub"],)
        )
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")

        return dict(user)

    finally:
        cursor.close()
        conn.close()


# ════════════════════════════════════════════════════════════
# LOGOUT
# ════════════════════════════════════════════════════════════
@router.post("/logout")
def logout(current_user: dict = Depends(get_current_user)):
    """
    Logout the current user.
    With JWT tokens, logout is handled client-side by deleting
    the token from localStorage. This endpoint logs the event.
    """
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO audit_logs
                (actor_id, actor_type, event_type, event_description)
            VALUES (%s, 'voter', 'LOGOUT', 'User logged out')
            """,
            (current_user["sub"],)
        )
        conn.commit()
        return {"message": "Logged out successfully."}
    finally:
        cursor.close()
        conn.close()

# ── TEMPORARY DEBUG ENDPOINT - remove before submission ──
@router.post("/debug-login")
def debug_login(data: VoterLogin):
    """
    Temporary endpoint to diagnose login issues.
    Shows exactly what the system finds for a student number.
    DELETE THIS before submitting your project.
    """
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        # Step 1: Does the identifier exist (username, student number, or email)?
        cursor.execute(
            """
            SELECT u.user_id, u.full_name, u.email,
                   u.password_hash, u.role, u.is_active,
                   u.username, v.student_number
            FROM users u
            LEFT JOIN voters v ON u.user_id = v.user_id
            WHERE LOWER(u.username)      = LOWER(%s)
               OR LOWER(v.student_number) = LOWER(%s)
               OR LOWER(u.email)          = LOWER(%s)
            LIMIT 1
            """,
            (data.identifier, data.identifier, data.identifier)
        )
        user = cursor.fetchone()

        if not user:
            return {
                "found":   False,
                "problem": "No user found with this identifier",
                "tried":   data.identifier,
            }

        # Step 2: Does the password match?
        password_ok = verify_password(data.password, user["password_hash"])

        return {
            "found":          True,
            "student_number": user["student_number"],
            "full_name":      user["full_name"],
            "role":           user["role"],
            "is_active":      user["is_active"],
            "password_match": password_ok,
            "hash_preview":   user["password_hash"][:20] + "...",
            "problem": (
                None if password_ok
                else "Password does not match stored hash - regenerate hash"
            ),
        }
    finally:
        cursor.close()
        conn.close()