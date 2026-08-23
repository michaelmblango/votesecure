# backend/routers/super_admin.py
# ============================================================
# Super Admin Panel — platform owner only
# You (Michael) use this to:
#   - View all organisations and their status
#   - View all payment receipt requests
#   - Generate licence codes for verified payments
#   - View all licences issued
#   - Activate or suspend organisations
#
# Authentication: separate JWT signed with SUPER_ADMIN_JWT_SECRET
# Access via: /api/super/*
# ============================================================

import secrets
import string
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from jose import jwt, JWTError
from database import get_connection
from config import settings
from services.email_service import send_licence_code

router   = APIRouter()
security = HTTPBearer()


# ── Super admin JWT ───────────────────────────────────────────
def make_super_token(super_admin_id: str) -> str:
    payload = {
        "sub":  super_admin_id,
        "type": "super_admin",
        "exp":  datetime.utcnow() + timedelta(hours=8),
        "iat":  datetime.utcnow(),
    }
    return jwt.encode(
        payload,
        settings.SUPER_ADMIN_JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )

def verify_super_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SUPER_ADMIN_JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        if payload.get("type") != "super_admin":
            raise HTTPException(status_code=403, detail="Super admin access required.")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

def get_super_admin(payload: dict = Depends(verify_super_token)) -> dict:
    return payload


# ── Helpers ───────────────────────────────────────────────────
def make_licence_code() -> str:
    chars = string.ascii_uppercase + string.digits
    return (
        "".join(secrets.choice(chars) for _ in range(4)) + "-" +
        "".join(secrets.choice(chars) for _ in range(4)) + "-" +
        "".join(secrets.choice(chars) for _ in range(4))
    )


# ── Models ────────────────────────────────────────────────────
class SuperLogin(BaseModel):
    username: str
    password: str

class GenerateLicence(BaseModel):
    org_id:    str
    plan_name: str
    notes:     Optional[str] = None

class OrgAction(BaseModel):
    action: str  # "activate" | "suspend" | "reactivate"


# ════════════════════════════════════════════════════════════════
# LOGIN
# ════════════════════════════════════════════════════════════════
@router.post("/login")
def super_login(data: SuperLogin):
    from services.auth_service import verify_password
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT super_admin_id, password_hash, is_active FROM super_admins WHERE username = %s",
            (data.username,)
        )
        admin = cursor.fetchone()
        if not admin or not verify_password(data.password, admin["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid credentials.")
        if not admin["is_active"]:
            raise HTTPException(status_code=403, detail="Account deactivated.")
        token = make_super_token(str(admin["super_admin_id"]))
        return {"access_token": token, "token_type": "bearer"}
    finally:
        cursor.close(); conn.close()


# ════════════════════════════════════════════════════════════════
# DASHBOARD STATS
# ════════════════════════════════════════════════════════════════
@router.get("/stats")
def get_stats(current: dict = Depends(get_super_admin)):
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT COUNT(*) AS total FROM organisations")
        total_orgs = cursor.fetchone()["total"]

        cursor.execute("SELECT COUNT(*) AS total FROM organisations WHERE status = 'active'")
        active_orgs = cursor.fetchone()["total"]

        cursor.execute("SELECT COUNT(*) AS total FROM organisations WHERE status = 'pending'")
        pending_orgs = cursor.fetchone()["total"]

        cursor.execute("SELECT COUNT(*) AS total FROM election_licences WHERE status = 'unused'")
        unused_licences = cursor.fetchone()["total"]

        cursor.execute("SELECT COUNT(*) AS total FROM election_licences WHERE status = 'used'")
        used_licences = cursor.fetchone()["total"]

        cursor.execute("SELECT COUNT(*) AS total FROM elections")
        total_elections = cursor.fetchone()["total"]

        cursor.execute("SELECT COUNT(*) AS total FROM voters")
        total_voters = cursor.fetchone()["total"]

        cursor.execute("SELECT COUNT(*) AS total FROM votes")
        total_votes = cursor.fetchone()["total"]

        return {
            "organisations": {
                "total":   total_orgs,
                "active":  active_orgs,
                "pending": pending_orgs,
            },
            "licences": {
                "unused": unused_licences,
                "used":   used_licences,
                "total":  unused_licences + used_licences,
            },
            "platform": {
                "elections": total_elections,
                "voters":    total_voters,
                "votes":     total_votes,
            },
        }
    finally:
        cursor.close(); conn.close()


# ════════════════════════════════════════════════════════════════
# LIST ALL ORGANISATIONS
# ════════════════════════════════════════════════════════════════
@router.get("/organisations")
def list_organisations(current: dict = Depends(get_super_admin)):
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT
                o.*,
                COUNT(DISTINCT a.org_admin_id)  AS admin_count,
                COUNT(DISTINCT e.election_id)   AS election_count,
                COUNT(DISTINCT l.licence_id)    AS licence_count
            FROM organisations o
            LEFT JOIN org_admins         a ON a.org_id    = o.org_id
            LEFT JOIN elections          e ON e.org_id    = o.org_id
            LEFT JOIN election_licences  l ON l.org_id    = o.org_id
            GROUP BY o.org_id
            ORDER BY o.created_at DESC
            """
        )
        orgs = cursor.fetchall()
        return {"organisations": [dict(o) for o in orgs]}
    finally:
        cursor.close(); conn.close()


# ════════════════════════════════════════════════════════════════
# GET SINGLE ORGANISATION DETAIL
# ════════════════════════════════════════════════════════════════
@router.get("/organisations/{org_id}")
def get_organisation(org_id: str, current: dict = Depends(get_super_admin)):
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM organisations WHERE org_id = %s", (org_id,))
        org = cursor.fetchone()
        if not org:
            raise HTTPException(status_code=404, detail="Organisation not found.")

        cursor.execute(
            "SELECT org_admin_id, full_name, username, email, is_owner, is_active, created_at, last_login FROM org_admins WHERE org_id = %s ORDER BY is_owner DESC, created_at ASC",
            (org_id,)
        )
        admins = cursor.fetchall()

        cursor.execute(
            """
            SELECT l.*, p.plan_name, p.max_voters, p.price_usd
            FROM election_licences l
            JOIN election_plans p ON l.plan_id = p.plan_id
            WHERE l.org_id = %s
            ORDER BY l.created_at DESC
            """,
            (org_id,)
        )
        licences = cursor.fetchall()

        cursor.execute(
            "SELECT election_id, title, status, plan_name, max_voters, created_at FROM elections WHERE org_id = %s ORDER BY created_at DESC",
            (org_id,)
        )
        elections = cursor.fetchall()

        return {
            "organisation": dict(org),
            "admins":       [dict(a) for a in admins],
            "licences":     [dict(l) for l in licences],
            "elections":    [dict(e) for e in elections],
        }
    finally:
        cursor.close(); conn.close()


# ════════════════════════════════════════════════════════════════
# ACTIVATE / SUSPEND ORGANISATION
# ════════════════════════════════════════════════════════════════
@router.patch("/organisations/{org_id}/action")
def org_action(org_id: str, data: OrgAction, current: dict = Depends(get_super_admin)):
    allowed = {"activate": "active", "suspend": "suspended", "reactivate": "active"}
    if data.action not in allowed:
        raise HTTPException(status_code=400, detail=f"Action must be one of: {list(allowed.keys())}")

    conn   = get_connection()
    cursor = conn.cursor()
    try:
        new_status = allowed[data.action]
        cursor.execute(
            "UPDATE organisations SET status = %s WHERE org_id = %s RETURNING org_name",
            (new_status, org_id)
        )
        org = cursor.fetchone()
        if not org:
            raise HTTPException(status_code=404, detail="Organisation not found.")
        conn.commit()
        return {"message": f"{org['org_name']} is now {new_status}.", "status": new_status}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close(); conn.close()


# ════════════════════════════════════════════════════════════════
# GENERATE LICENCE CODE
# ════════════════════════════════════════════════════════════════
@router.post("/licences/generate")
def generate_licence(data: GenerateLicence, current: dict = Depends(get_super_admin)):
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT * FROM election_plans WHERE plan_name = %s AND is_active = TRUE",
            (data.plan_name,)
        )
        plan = cursor.fetchone()
        if not plan:
            raise HTTPException(status_code=400, detail=f"Plan '{data.plan_name}' not found.")

        cursor.execute(
            "SELECT o.org_name, a.full_name, a.email FROM organisations o JOIN org_admins a ON a.org_id = o.org_id WHERE o.org_id = %s AND a.is_owner = TRUE LIMIT 1",
            (data.org_id,)
        )
        org_owner = cursor.fetchone()
        if not org_owner:
            raise HTTPException(status_code=404, detail="Organisation or owner not found.")

        # Generate unique code
        for _ in range(10):
            code = make_licence_code()
            cursor.execute("SELECT licence_id FROM election_licences WHERE licence_code = %s", (code,))
            if not cursor.fetchone():
                break

        cursor.execute(
            """
            INSERT INTO election_licences (licence_code, org_id, plan_id, notes)
            VALUES (%s, %s, %s, %s)
            RETURNING licence_id
            """,
            (code, data.org_id, str(plan["plan_id"]), data.notes)
        )
        lic_id = str(cursor.fetchone()["licence_id"])
        conn.commit()

        # Email the licence to the org owner
        send_licence_code(
            email=org_owner["email"],
            name=org_owner["full_name"],
            org_name=org_owner["org_name"],
            licence_code=code,
            plan_name=data.plan_name,
            max_voters=plan["max_voters"],
        )

        return {
            "licence_code": code,
            "licence_id":   lic_id,
            "plan":         data.plan_name,
            "max_voters":   plan["max_voters"],
            "org":          org_owner["org_name"],
            "emailed_to":   org_owner["email"],
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close(); conn.close()


# ════════════════════════════════════════════════════════════════
# LIST ALL LICENCES
# ════════════════════════════════════════════════════════════════
@router.get("/licences")
def list_licences(current: dict = Depends(get_super_admin)):
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT
                l.licence_code, l.status, l.created_at, l.used_at, l.notes,
                p.plan_name, p.max_voters, p.price_usd,
                o.org_name,
                a.full_name AS used_by_name
            FROM election_licences l
            JOIN election_plans  p ON l.plan_id = p.plan_id
            LEFT JOIN organisations  o ON l.org_id  = o.org_id
            LEFT JOIN org_admins     a ON l.used_by = a.org_admin_id
            ORDER BY l.created_at DESC
            """
        )
        licences = cursor.fetchall()
        return {"licences": [dict(l) for l in licences]}
    finally:
        cursor.close(); conn.close()


# ════════════════════════════════════════════════════════════════
# LIST ALL ELECTION PLANS
# ════════════════════════════════════════════════════════════════
@router.get("/plans")
def list_plans(current: dict = Depends(get_super_admin)):
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM election_plans ORDER BY display_order")
        plans = cursor.fetchall()
        return {"plans": [dict(p) for p in plans]}
    finally:
        cursor.close(); conn.close()


# ════════════════════════════════════════════════════════════════
# UPDATE PLAN PRICING
# ════════════════════════════════════════════════════════════════
class PlanUpdate(BaseModel):
    price_usd:    Optional[float] = None
    description:  Optional[str]   = None
    is_active:    Optional[bool]  = None

@router.patch("/plans/{plan_name}")
def update_plan(plan_name: str, data: PlanUpdate, current: dict = Depends(get_super_admin)):
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        updates = []
        values  = []
        if data.price_usd is not None:
            updates.append("price_usd = %s");   values.append(data.price_usd)
        if data.description is not None:
            updates.append("description = %s"); values.append(data.description)
        if data.is_active is not None:
            updates.append("is_active = %s");   values.append(data.is_active)
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update.")
        values.append(plan_name)
        cursor.execute(
            f"UPDATE election_plans SET {', '.join(updates)} WHERE plan_name = %s RETURNING *",
            values
        )
        updated = cursor.fetchone()
        if not updated:
            raise HTTPException(status_code=404, detail="Plan not found.")
        conn.commit()
        return {"message": "Plan updated.", "plan": dict(updated)}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close(); conn.close()
