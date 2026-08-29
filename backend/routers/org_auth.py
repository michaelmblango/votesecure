# backend/routers/org_auth.py

import secrets
import string
import random
import re
from fastapi import APIRouter, HTTPException, status, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, validator
from typing import Optional
from jose import jwt, JWTError
from datetime import datetime, timedelta

from database import get_connection
from services.auth_service import hash_password, verify_password
from services.email_service import (
    send_admin_registration_confirmation,
    send_invite_code, send_org_activated, send_admin_otp,
    send_password_reset_email,
)
from config import settings

router   = APIRouter()
security = HTTPBearer()


def generate_invite_code(length=10) -> str:
    chars = string.ascii_uppercase + string.digits
    return "VS-" + "".join(secrets.choice(chars) for _ in range(length))


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower().strip())
    return slug[:80].strip("-")


def make_admin_token(org_admin_id: str, org_id: str, is_owner: bool,
                     linked_user_id: str = None) -> str:
    payload = {
        "sub":             org_admin_id,
        "user_id":         linked_user_id or org_admin_id,
        "org":             org_id,
        "owner":           is_owner,
        "type":            "org_admin",
        "role":            "election_admin",
        "exp":             datetime.utcnow() + timedelta(minutes=60),
        "iat":             datetime.utcnow(),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def verify_admin_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        # Accept both org_admin tokens and legacy admin tokens
        token_type = payload.get("type", "")
        role       = payload.get("role", "")
        if token_type not in ("org_admin",) and role not in ("election_admin", "system_admin"):
            raise HTTPException(status_code=401, detail="Invalid token type.")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Token is invalid or expired.")


def get_current_org_admin(payload: dict = Depends(verify_admin_token)) -> dict:
    return payload


def require_owner(current: dict = Depends(get_current_org_admin)) -> dict:
    """
    Dependency that requires the current admin to be
    the organisation owner (is_owner = True).
    Returns 403 if not the owner.
    """
    if not current.get("owner"):
        raise HTTPException(
            status_code=403,
            detail="This action requires organisation owner access."
        )
    return current


class OrgSignup(BaseModel):
    org_name:  str
    full_name: str
    username:  str
    password:  str
    email:     EmailStr


class AdminJoin(BaseModel):
    full_name: str
    username:  str
    password:  str
    email:     EmailStr


class AdminLogin(BaseModel):
    username: str
    password: str


class OTPVerify(BaseModel):
    org_admin_id: str
    otp_code:     str


@router.get("/plans")
def list_plans():
    conn = get_connection(); cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM election_plans WHERE is_active=TRUE ORDER BY display_order")
        return {"plans": [dict(p) for p in cursor.fetchall()]}
    finally:
        cursor.close(); conn.close()


@router.post("/signup", status_code=201)
def org_signup(data: OrgSignup):
    conn = get_connection(); cursor = conn.cursor()
    try:
        cursor.execute("SELECT org_admin_id FROM org_admins WHERE username=%s", (data.username,))
        if cursor.fetchone():
            raise HTTPException(409, "Username already taken.")
        cursor.execute("SELECT org_admin_id FROM org_admins WHERE email=%s", (data.email,))
        if cursor.fetchone():
            raise HTTPException(409, "Email already registered.")

        base_slug = slugify(data.org_name)
        slug = base_slug; counter = 1
        while True:
            cursor.execute("SELECT org_id FROM organisations WHERE slug=%s", (slug,))
            if not cursor.fetchone(): break
            slug = f"{base_slug}-{counter}"; counter += 1

        invite_code = generate_invite_code()
        password_hash = hash_password(data.password)

        cursor.execute(
            "INSERT INTO organisations (org_name, slug, status, invite_code, contact_email) VALUES (%s,%s,'pending',%s,%s) RETURNING org_id",
            (data.org_name, slug, invite_code, data.email)
        )
        org_id = str(cursor.fetchone()["org_id"])

        # Create a corresponding users row so elections.created_by FK works
        cursor.execute(
            """
            INSERT INTO users (full_name, email, password_hash, role)
            VALUES (%s, %s, %s, 'election_admin')
            ON CONFLICT (email) DO UPDATE
                SET role = 'election_admin'
            RETURNING user_id
            """,
            (data.full_name, data.email, password_hash)
        )
        users_row   = cursor.fetchone()
        linked_user_id = str(users_row["user_id"])

        cursor.execute(
            """
            INSERT INTO org_admins
                (org_id, username, email, password_hash, full_name,
                 is_owner, linked_user_id)
            VALUES (%s, %s, %s, %s, %s, TRUE, %s)
            RETURNING org_admin_id
            """,
            (org_id, data.username, data.email, password_hash,
             data.full_name, linked_user_id)
        )
        conn.commit()

        send_admin_registration_confirmation(email=data.email, name=data.full_name, username=data.username, password=data.password, org_name=data.org_name, is_owner=True)
        send_invite_code(data.email, data.full_name, data.org_name, invite_code)

        return {"message": "Organisation created. Invite 2 more admins to activate.", "org_id": org_id, "org_name": data.org_name, "invite_code": invite_code, "status": "pending", "admins_needed": settings.MIN_ORG_ADMINS - 1}
    except HTTPException: raise
    except Exception as e: conn.rollback(); raise HTTPException(500, f"Signup failed: {str(e)}")
    finally: cursor.close(); conn.close()


@router.post("/join/{invite_code}", status_code=201)
def admin_join(invite_code: str, data: AdminJoin):
    conn = get_connection(); cursor = conn.cursor()
    try:
        cursor.execute("SELECT org_id, org_name, status FROM organisations WHERE invite_code=%s", (invite_code,))
        org = cursor.fetchone()
        if not org: raise HTTPException(404, "Invalid invite code.")
        if org["status"] == "active": raise HTTPException(400, "Organisation already has enough admins.")

        org_id = str(org["org_id"]); org_name = org["org_name"]

        cursor.execute("SELECT org_admin_id FROM org_admins WHERE org_id=%s AND username=%s", (org_id, data.username))
        if cursor.fetchone(): raise HTTPException(409, "Username already taken.")
        cursor.execute("SELECT org_admin_id FROM org_admins WHERE email=%s", (data.email,))
        if cursor.fetchone(): raise HTTPException(409, "Email already registered.")

        password_hash = hash_password(data.password)

        # Create matching users row
        cursor.execute(
            """
            INSERT INTO users (full_name, email, password_hash, role)
            VALUES (%s, %s, %s, 'election_admin')
            ON CONFLICT (email) DO UPDATE
                SET role = 'election_admin'
            RETURNING user_id
            """,
            (data.full_name, data.email, password_hash)
        )
        linked_user_id = str(cursor.fetchone()["user_id"])

        cursor.execute(
            """
            INSERT INTO org_admins
                (org_id, username, email, password_hash, full_name,
                 is_owner, linked_user_id)
            VALUES (%s, %s, %s, %s, %s, FALSE, %s)
            RETURNING org_admin_id
            """,
            (org_id, data.username, data.email, password_hash,
             data.full_name, linked_user_id)
        )
        conn.commit()

        cursor.execute("SELECT COUNT(*) AS cnt FROM org_admins WHERE org_id=%s AND is_active=TRUE", (org_id,))
        admin_count = cursor.fetchone()["cnt"]

        send_admin_registration_confirmation(email=data.email, name=data.full_name, username=data.username, password=data.password, org_name=org_name, is_owner=False)

        if admin_count >= settings.MIN_ORG_ADMINS:
            cursor.execute("UPDATE organisations SET status='active', activated_at=NOW() WHERE org_id=%s", (org_id,))
            conn.commit()
            cursor.execute("SELECT full_name, email FROM org_admins WHERE org_id=%s AND is_active=TRUE", (org_id,))
            for a in cursor.fetchall(): send_org_activated(a["email"], a["full_name"], org_name, admin_count)

        return {"message": f"Joined {org_name}. Check your email for credentials.", "org_name": org_name, "admin_count": admin_count, "org_active": admin_count >= settings.MIN_ORG_ADMINS}
    except HTTPException: raise
    except Exception as e: conn.rollback(); raise HTTPException(500, str(e))
    finally: cursor.close(); conn.close()


@router.post("/login")
def admin_login(data: AdminLogin, request: Request):
    conn = get_connection(); cursor = conn.cursor()
    try:
        cursor.execute(
            """SELECT a.org_admin_id, a.full_name, a.email, a.password_hash, a.is_active, a.is_owner, a.org_id, o.org_name, o.status
               FROM org_admins a JOIN organisations o ON a.org_id=o.org_id WHERE a.username=%s""",
            (data.username,)
        )
        admin = cursor.fetchone()
        if not admin or not verify_password(data.password, admin["password_hash"]):
            raise HTTPException(401, "Invalid username or password.")
        if not admin["is_active"]: raise HTTPException(403, "Account deactivated.")
        if admin["status"] == "pending": raise HTTPException(403, f"Organisation not yet active. {settings.MIN_ORG_ADMINS} admins must register first.")

        otp_code = str(random.randint(100000, 999999))
        expires  = datetime.utcnow() + timedelta(minutes=10)
        cursor.execute("INSERT INTO org_admin_otp (org_admin_id, otp_code, expires_at) VALUES (%s,%s,%s)", (str(admin["org_admin_id"]), otp_code, expires))
        conn.commit()

        send_admin_otp(admin["email"], admin["full_name"], otp_code, admin["org_name"])

        email = admin["email"]
        masked = email[:2] + "***@" + email.split("@")[1]
        return {"status": "otp_required", "org_admin_id": str(admin["org_admin_id"]), "org_name": admin["org_name"], "message": f"Verification code sent to {masked}"}
    except HTTPException: raise
    except Exception as e: conn.rollback(); raise HTTPException(500, str(e))
    finally: cursor.close(); conn.close()


@router.post("/login/otp")
def admin_login_otp(data: OTPVerify):
    conn = get_connection(); cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT otp_id FROM org_admin_otp WHERE org_admin_id=%s AND otp_code=%s AND is_used=FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
            (data.org_admin_id, data.otp_code)
        )
        otp_row = cursor.fetchone()
        if not otp_row: raise HTTPException(401, "Invalid or expired code.")
        cursor.execute("UPDATE org_admin_otp SET is_used=TRUE WHERE otp_id=%s", (str(otp_row["otp_id"]),))

        cursor.execute(
            """
            SELECT a.org_admin_id, a.full_name, a.username, a.email,
                   a.is_owner, a.org_id, a.linked_user_id, o.org_name
            FROM org_admins a
            JOIN organisations o ON a.org_id = o.org_id
            WHERE a.org_admin_id=%s
            """,
            (data.org_admin_id,)
        )
        admin = cursor.fetchone()
        if not admin: raise HTTPException(404, "Admin not found.")

        cursor.execute("UPDATE org_admins SET last_login=NOW() WHERE org_admin_id=%s", (str(admin["org_admin_id"]),))
        conn.commit()

        token = make_admin_token(
            org_admin_id=str(admin["org_admin_id"]),
            org_id=str(admin["org_id"]),
            is_owner=admin["is_owner"],
            linked_user_id=str(admin["linked_user_id"]) if admin["linked_user_id"] else None,
        )
        return {"status": "authenticated", "access_token": token, "token_type": "bearer", "org_admin_id": str(admin["org_admin_id"]), "org_id": str(admin["org_id"]), "org_name": admin["org_name"], "full_name": admin["full_name"], "username": admin["username"], "is_owner": admin["is_owner"]}
    except HTTPException: raise
    except Exception as e: conn.rollback(); raise HTTPException(500, str(e))
    finally: cursor.close(); conn.close()


@router.get("/me/role")
def get_my_role(current: dict = Depends(get_current_org_admin)):
    """
    Returns current admin role details.
    Used by frontend to determine which UI to show.
    """
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT
                a.org_admin_id, a.username, a.full_name,
                a.email, a.is_owner, a.created_at,
                o.org_name, o.status, o.org_id,
                (
                    SELECT COUNT(*)
                    FROM org_admins
                    WHERE org_id = a.org_id AND is_active = TRUE
                ) AS total_admins
            FROM org_admins a
            JOIN organisations o ON a.org_id = o.org_id
            WHERE a.org_admin_id = %s
            """,
            (current["sub"],)
        )
        admin = cursor.fetchone()
        if not admin:
            raise HTTPException(status_code=404, detail="Not found.")

        return {
            "org_admin_id": str(admin["org_admin_id"]),
            "username":     admin["username"],
            "full_name":    admin["full_name"],
            "email":        admin["email"],
            "is_owner":     admin["is_owner"],
            "org_name":     admin["org_name"],
            "org_id":       str(admin["org_id"]),
            "org_status":   admin["status"],
            "total_admins": admin["total_admins"],
            "permissions": {
                "can_create_elections":   admin["is_owner"],
                "can_invite_voters":      admin["is_owner"],
                "can_invite_candidates":  admin["is_owner"],
                "can_approve_voters":     True,
                "can_approve_candidates": True,
                "can_view_audit_log":     True,
                "can_view_results":       True,
            }
        }
    finally:
        cursor.close(); conn.close()


@router.get("/me")
def get_me(current: dict = Depends(get_current_org_admin)):
    conn = get_connection(); cursor = conn.cursor()
    try:
        cursor.execute("SELECT a.*, o.org_name, o.status, o.slug FROM org_admins a JOIN organisations o ON a.org_id=o.org_id WHERE a.org_admin_id=%s", (current["sub"],))
        admin = cursor.fetchone()
        if not admin: raise HTTPException(404, "Not found.")
        d = dict(admin); d.pop("password_hash", None); return d
    finally: cursor.close(); conn.close()


# ── FORGOT PASSWORD ───────────────────────────────────────────
class ForgotPasswordRequest(BaseModel):
    email: str

@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest):
    """
    Send a password reset link to an org admin's email.
    Always returns success to prevent email enumeration attacks.
    """
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT org_admin_id, full_name, email FROM org_admins WHERE email = %s AND is_active = TRUE",
            (data.email,)
        )
        admin = cursor.fetchone()

        if admin:
            token = secrets.token_urlsafe(48)
            cursor.execute(
                """
                INSERT INTO password_reset_tokens (admin_id, token)
                VALUES (%s, %s)
                """,
                (str(admin["org_admin_id"]), token)
            )
            conn.commit()

            reset_url = f"{settings.PLATFORM_URL}/org/reset-password/{token}"
            send_password_reset_email(
                email=admin["email"],
                name=admin["full_name"],
                reset_url=reset_url,
            )

        return {
            "message": "If an account with that email exists, a password reset link has been sent."
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close(); conn.close()


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @validator("new_password")
    def password_strong(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest):
    """
    Reset an org admin password using a valid reset token.
    """
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT t.token_id, t.admin_id, t.expires_at, t.is_used
            FROM password_reset_tokens t
            WHERE t.token = %s
            """,
            (data.token,)
        )
        token_row = cursor.fetchone()

        if not token_row:
            raise HTTPException(status_code=400, detail="Invalid or expired reset link.")
        if token_row["is_used"]:
            raise HTTPException(status_code=400, detail="This reset link has already been used.")
        if token_row["expires_at"] < datetime.utcnow():
            raise HTTPException(status_code=400, detail="This reset link has expired. Request a new one.")

        new_hash = hash_password(data.new_password)

        cursor.execute(
            "UPDATE org_admins SET password_hash = %s WHERE org_admin_id = %s",
            (new_hash, str(token_row["admin_id"]))
        )
        cursor.execute(
            "UPDATE password_reset_tokens SET is_used = TRUE WHERE token_id = %s",
            (str(token_row["token_id"]),)
        )
        conn.commit()

        return {"message": "Password reset successfully. You can now log in with your new password."}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close(); conn.close()
